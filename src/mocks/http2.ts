export const constants = {
    HTTP2_HEADER_AUTHORITY: ':authority',
    HTTP2_HEADER_METHOD: ':method',
    HTTP2_HEADER_PATH: ':path',
    HTTP2_HEADER_SCHEME: ':scheme',
    HTTP2_HEADER_STATUS: ':status',
    HTTP2_HEADER_ACCEPT_ENCODING: 'accept-encoding',
    HTTP2_HEADER_ACCEPT_LANGUAGE: 'accept-language',
    HTTP2_HEADER_DATE: 'date',
    HTTP2_HEADER_CONTENT_TYPE: 'content-type',
    HTTP2_HEADER_CONTENT_LENGTH: 'content-length',
    HTTP2_HEADER_USER_AGENT: 'user-agent',
};

export const getDefaultSettings = () => ({});
export const getPackedSettings = () => ({});
export const getUnpackedSettings = () => ({});
export const createServer = () => ({});
export const connect = () => ({});

export default {
    constants,
    getDefaultSettings,
    getPackedSettings,
    getUnpackedSettings,
    createServer,
    connect,
};
