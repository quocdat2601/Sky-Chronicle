const listeners = new Map();

export const animationBus = {
  register(key, callback) {
    if (!key || typeof callback !== 'function') return;
    listeners.set(key, callback);
  },
  unregister(key) {
    listeners.delete(key);
  },
  trigger(key, anim, durationMs = 0, backTo = 'wait') {
    const cb = listeners.get(key);
    if (cb) cb(anim, durationMs, backTo);
  },
};

