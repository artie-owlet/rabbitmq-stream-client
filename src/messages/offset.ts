export enum OffsetTypes {
    First = 1,
    Last = 2,
    Next = 3,
    Offset = 4,
    Timestamp = 5,
}

interface IRelativeOffset {
    type: OffsetTypes.First | OffsetTypes.Last | OffsetTypes.Next;
}

interface IAbsoluteOffset {
    type: OffsetTypes.Offset | OffsetTypes.Timestamp;
    value: bigint;
}

export type Offset = IRelativeOffset | IAbsoluteOffset;
