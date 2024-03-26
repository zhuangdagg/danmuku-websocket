import { CONSTANTS } from './constant'


export const MESSAGE_PROTOCOL = [
    {
      name: "Header Length",
      key: "headerLen",
      bytes: 2,
      offset: CONSTANTS.WS_HEADER_OFFSET,
      value: CONSTANTS.WS_PACKAGE_HEADER_TOTAL_LENGTH,
    },
    {
      name: "Protocol Version",
      key: "ver",
      bytes: 2,
      offset: CONSTANTS.WS_VERSION_OFFSET,
      value: CONSTANTS.WS_HEADER_DEFAULT_VERSION,
    },
    {
      name: "Operation",
      key: "op",
      bytes: 4,
      offset: CONSTANTS.WS_OPERATION_OFFSET,
      value: CONSTANTS.WS_HEADER_DEFAULT_OPERATION,
    },
    {
      name: "Sequence Id",
      key: "seq",
      bytes: 4,
      offset: CONSTANTS.WS_SEQUENCE_OFFSET,
      value: CONSTANTS.WS_HEADER_DEFAULT_SEQUENCE,
    },
  ];