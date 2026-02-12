const LAST_SPACE_KEY = 'last_selected_space_id';

export class DestinationService {
  constructor(client, settingsStore) {
    this.client = client;
    this.settingsStore = settingsStore;
  }

  async browseWorkspaces() { return (await this.client.getWorkspaces()).teams; }
  async browseSpaces(workspaceId) { return (await this.client.getSpaces(workspaceId)).spaces; }
  async browseFolders(spaceId) { return (await this.client.getFolders(spaceId)).folders; }

  async resolveListNamedList(folderId) {
    const result = await this.client.getLists(folderId);
    return result.lists.find((item) => item.name === 'List') ?? null;
  }

  async saveLastSelectedSpace(spaceId) { await this.settingsStore.set(LAST_SPACE_KEY, spaceId); }
  async getLastSelectedSpace() { return this.settingsStore.get(LAST_SPACE_KEY); }

  async validateDestination(workspaceId, spaceId, folderId) {
    const [workspaces, spaces, folders, list] = await Promise.all([
      this.browseWorkspaces(),
      this.browseSpaces(workspaceId),
      this.browseFolders(spaceId),
      this.resolveListNamedList(folderId),
    ]);

    if (!list) throw new Error('Selected folder is missing list named exactly "List".');

    const workspace = workspaces.find((item) => item.id === workspaceId);
    const space = spaces.find((item) => item.id === spaceId);
    const folder = folders.find((item) => item.id === folderId);
    if (!workspace || !space || !folder) throw new Error('Destination selection is not valid.');

    await this.saveLastSelectedSpace(space.id);
    return { workspace, space, folder, list };
  }
}
