export enum Commands {
    DeclarePublisher = 0x0001,
    Publish = 0x0002,
    PublishConfirm = 0x0003,
    PublishError = 0x0004,
    QueryPublisherSequence = 0x0005,
    DeletePublisher = 0x0006,
    Subscribe = 0x0007,
    Deliver = 0x0008,
    Credit = 0x0009,
    CreditResponse = 0x8009,
    StoreOffset = 0x000a,
    QueryOffset = 0x000b,
    Unsubscribe = 0x000c,
    Create = 0x000d,
    Delete = 0x000e,
    Metadata = 0x000f,
    MetadataUpdate = 0x0010,
    PeerProperties = 0x0011,
    SaslHandshake = 0x0012,
    SaslAuthenticate = 0x0013,
    Tune = 0x0014,
    Open = 0x0015,
    Close = 0x0016,
    Heartbeat = 0x0017,
    Route = 0x0018,
    Partitions = 0x0019,
    ConsumerUpdate = 0x001a,
    ExchangeCommandVersions = 0x001b,
    StreamStats = 0x001c,
}

export const MAX_CORRELATION_ID = 0xFFFFFFFF;
export const RESPONSE_FLAG = 0x8000;
export const RESPONSE_CODE_OK = 0x01;

export enum OffsetTypes {
    First = 1,
    Last = 2,
    Next = 3,
    Offset = 4,
    Timestamp = 5,
}
