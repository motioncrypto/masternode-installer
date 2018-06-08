const state = {
  accessToken: null,
  genkey: null,
  output: null,
  ip: null,
  mnName: null,
  mnConfPath: null,
};

const mutations = {
  SET_ACCESS_TOKEN(state, payload) {
    state.accessToken = payload.accessToken;
  },
  SET_GENKEY(state, payload) {
    state.genkey = payload.genkey;
  },
  SET_OUTPUT(state, payload) {
    state.output = payload.output;
  },
  SET_IP(state, payload) {
    state.ip = payload.ip;
  },
  SET_MNNAME(state, payload) {
    state.mnName = payload.mnName;
  },
  SET_MNCONFPATH(state, payload) {
    state.mnConfPath = payload.mnConfPath;
  },
};

export default {
  state,
  mutations,
};
