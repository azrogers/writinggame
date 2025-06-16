const NUM_ICONS = 904;

export class IconsManager {
  private static _assignedIcons: { [id: number]: boolean } = {};
  private static _userIcons: { [id: string]: number } = {};

  static assignIcon(): number {
    let id = -1;
    do {
      id = Math.floor(Math.random() * NUM_ICONS) + 1;
    } while (this._assignedIcons[id]);

    this._assignedIcons[id] = true;
    return id;
  }

  static getOrAssignIcon(id: string): number {
    if (this._userIcons[id]) {
      return this._userIcons[id];
    }

    this._userIcons[id] = this.assignIcon();
    return this._userIcons[id];
  }

  static getImageUrl(id: number): string {
    return `/img/icons/${id.toString().padStart(3, "0")}.png`;
  }

  static reset() {
    this._assignedIcons = {};
    this._userIcons = {};
  }
}
