export class Floor {
  constructor(
    public readonly number: number,
    public readonly hasUp: boolean,
    public readonly hasDown: boolean,
  ) {}
  canCall(dir: "UP" | "DOWN") {
    return dir === "UP" ? this.hasUp : this.hasDown;
  }
}
