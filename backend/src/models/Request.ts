export abstract class Call {
  constructor(
    public readonly floor: number,
    public readonly timestamp = Date.now(),
  ) {}
  abstract readonly kind: string;
}

export class HallCall extends Call {
  readonly kind = "hall" as const;
  constructor(
    floor: number,
    public readonly direction: "UP" | "DOWN",
  ) {
    super(floor);
  }
}

export class CarCall extends Call {
  readonly kind = "car" as const;
  constructor(
    floor: number,
    public readonly elevatorId: number,
  ) {
    super(floor);
  }
}
