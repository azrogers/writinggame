export class JsonLoader {
  private static _jsonData: { [path: string]: any };
  private static _loaders: { [path: string]: Promise<any> };

  static preload(path: string) {
    this._loaders[path] = fetch("/data/" + path)
      .then((response) => response.json())
      .then((json) => {
        this._jsonData[path] = json;
        return json;
      });
  }

  static load(path: string): Promise<any> {
    if (this._jsonData[path]) {
      return Promise.resolve(this._jsonData[path]);
    }

    if (!this._loaders[path]) {
      this.preload(path);
    }

    return this._loaders[path];
  }
}
