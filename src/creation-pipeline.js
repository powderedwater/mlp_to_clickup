import { taskUrl } from './clickup-client.js';

const SUBTASK_SEQUENCE = ['Recorded', 'Edited', 'Uploaded'];

export class CreationPipelineService {
  constructor(client) {
    this.client = client;
  }

  async preflight(listId, videos) {
    const mediaTypeField = await this.resolveMediaTypeField(listId);
    if (!mediaTypeField) return { canProceed: true, unresolvedMediaTypes: [] };

    const unresolved = collectUnknownMediaTypes(videos, mediaTypeField.type_config?.options ?? []);
    return { canProceed: unresolved.length === 0, unresolvedMediaTypes: unresolved };
  }

  async run(input) {
    const { destination, assignments, videos, wordMetadata, mediaTypeDecisions } = input;
    const created = [];
    const errors = [];

    const mediaTypeField = await this.resolveMediaTypeField(destination.list.id);

    for (const video of videos) {
      try {
        const parentTask = await this.client.createTask(destination.list.id, {
          name: buildParentTaskName(video),
          assignees: [assignments.mediaLeadAssigneeId],
          custom_fields: mediaTypeField
            ? await this.resolveMediaTypeCustomFieldPayload(mediaTypeField, video.mediaType, mediaTypeDecisions)
            : [],
        });

        created.push({ name: parentTask.name, taskId: parentTask.id, url: taskUrl(parentTask), type: 'parent' });

        for (const subtaskName of SUBTASK_SEQUENCE) {
          try {
            const subtask = await this.client.createSubtask(parentTask.id, {
              name: subtaskName,
              assignees: [assignments.mediaLeadAssigneeId],
            });
            created.push({
              name: `${parentTask.name} / ${subtask.name}`,
              taskId: subtask.id,
              url: taskUrl(subtask),
              type: 'subtask',
            });
          } catch (error) {
            errors.push({
              stage: 'create_subtask',
              message: asErrorMessage(error),
              context: { parentTaskId: parentTask.id, subtaskName },
            });
          }
        }
      } catch (error) {
        errors.push({
          stage: 'create_video_task',
          message: asErrorMessage(error),
          context: { video: JSON.stringify(video) },
        });
      }
    }

    try {
      const courseTask = await this.client.createTask(destination.list.id, {
        name: `${destination.folder.name} Media Development`,
        assignees: [assignments.developmentLeadAssigneeId],
        tags: ['assigned media lead'],
        description: buildCourseDescription(wordMetadata),
      });
      created.push({ name: courseTask.name, taskId: courseTask.id, url: taskUrl(courseTask), type: 'course' });
    } catch (error) {
      errors.push({ stage: 'create_course_level_task', message: asErrorMessage(error) });
    }

    return {
      successCount: created.length,
      failureCount: errors.length,
      created,
      errors,
    };
  }

  async resolveMediaTypeField(listId) {
    const fields = await this.client.getListCustomFields(listId);
    return fields.find((field) => field.name === 'Media Type' && field.type === 'drop_down');
  }

  async resolveMediaTypeCustomFieldPayload(field, mediaTypeValue, decisions) {
    if (!mediaTypeValue) return [];

    const options = field.type_config?.options ?? [];
    const matched = options.find((option) => option.name.toLowerCase() === mediaTypeValue.toLowerCase());
    if (matched) return [{ id: field.id, value: matched.id }];

    const decision = decisions[mediaTypeValue.toLowerCase()];
    if (!decision) throw new Error(`Unknown Media Type "${mediaTypeValue}" is missing an explicit decision.`);

    if (decision.action === 'skip_field') return [];
    if (decision.action === 'map_manual') return [{ id: field.id, value: decision.optionId }];
    if (decision.action === 'create_option') {
      throw new Error(`Media Type option creation for "${mediaTypeValue}" requires UI support before running the pipeline.`);
    }

    return [];
  }
}

function buildParentTaskName(video) {
  const normalizedNumber = normalizeVideoNumber(video.videoNumber);
  if (video.lectureName && normalizedNumber) return `${normalizedNumber} – ${video.lectureName}`;
  return normalizedNumber || video.lectureName || 'Untitled Video';
}

function normalizeVideoNumber(value) {
  if (!value?.trim()) return '';
  const compact = value.trim();
  const match = compact.match(/(\d+)/);
  if (!match) return compact;
  return `Video ${match[1].padStart(2, '0')}`;
}

function collectUnknownMediaTypes(videos, options) {
  const optionSet = new Set(options.map((o) => o.name.toLowerCase()));
  const missing = new Set();
  for (const video of videos) {
    const mediaTypeValue = video.mediaType?.trim();
    if (mediaTypeValue && !optionSet.has(mediaTypeValue.toLowerCase())) missing.add(mediaTypeValue);
  }
  return [...missing].map((inputValue) => ({ inputValue, options }));
}

function buildCourseDescription(metadata) {
  const outcomes = metadata.outcomes?.length ? metadata.outcomes.map((item) => `- ${item}`).join('\n') : '- N/A';
  return [
    '# Course Media Development',
    '',
    `**Objective**: ${metadata.objective ?? 'N/A'}`,
    `**Prerequisites**: ${metadata.prerequisites ?? 'N/A'}`,
    '',
    '## Outcomes',
    outcomes,
    '',
    '## Notes',
    metadata.notes ?? 'N/A',
  ].join('\n');
}

function asErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unknown error';
}
