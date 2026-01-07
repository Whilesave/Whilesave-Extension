($ => {
  "use strict";

  /**
   * @param {*} ext
   */
  $.FeatureControlHelper = function (ext,support) {

    /**
     * Unified encapsulation using sessionStorage
     * firefox safari does not support chrome.storage.session
     */
    const sessionStorageShim = {
      set: (items) => {
        if ($.api.storage.session) {
          return ext.helper.dao.call("storageSessionSet", { params: items });
        }
        //Compatible implementation
        for (const [key, value] of Object.entries(items)) {
          sessionStorage.setItem(key, JSON.stringify(value));
        }
        return Promise.resolve();
      },
      get: (keys) => {
        if ($.api.storage.session) {
          return ext.helper.dao.call("storageSessionGet", { params: keys });
        }
        //Compatible implementation
        const result = {};
        if (Array.isArray(keys)) {
          for (const key of keys) {
            const value = sessionStorage.getItem(key);
            result[key] = value ? JSON.parse(value) : undefined;
          }
        } else if (typeof keys === "string") {
          const value = sessionStorage.getItem(keys);
          result[keys] = value ? JSON.parse(value) : undefined;
        } else if (typeof keys === "object") {
          for (const key in keys) {
            const value = sessionStorage.getItem(key);
            result[key] = value ? JSON.parse(value) : keys[key]; // default fallback
          }
        } else {
          // get all
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            result[key] = JSON.parse(sessionStorage.getItem(key));
          }
        }
        return Promise.resolve(result);
      },
      remove: (keys) => {
        if ($.api.storage.session) {
          return ext.helper.dao.call("storageSessionRemove", { params: keys });
        }
        //Compatible implementation
        (Array.isArray(keys) ? keys : [keys]).forEach((key) =>
          sessionStorage.removeItem(key)
        );
        return Promise.resolve();
      },
      clear: () => {
        if ($.api.storage.session) {
          return ext.helper.dao.call("storageSessionClear");
        }
        //Compatible implementation
        sessionStorage.clear();
        return Promise.resolve();
      },
    };

    //Dynamically generate key names
    //Each website independently controlled.
    const createFeatureKey = (key) => {
      return {
        until: `${key}_${support?support.p:"unknown"}_disabledUntil`,
        session: `${key}_${support?support.p:"unknown"}_sessionDisabled`,
      };
    };

    /**
     * Temporarily disable feature
     * @param {string} key - Function identifier
     * @param {number} durationMs - Disable duration (milliseconds)
     */
    this.disableTemporarily = async (key, durationMs) => {
      const until = Date.now() + durationMs;
      await $.api.storage.local.set({
        [createFeatureKey(key).until]: until,
      });
    };

    /**
     * Current session disabled features
     * @param {string} key - Function identifier
     */
    this.disableForSession = async (key) => {
      sessionStorageShim.set({
        [createFeatureKey(key).session]: "true",
      });
    };

    /**
     * Enable feature (remove disabled status)
     * @param {string} key - Function identifier
     */
    this.enable = async (key) => {
      const { until, session } = createFeatureKey(key);
      await $.api.storage.local.remove(until);
      await sessionStorageShim.remove(session);
    };

    /**
     * Determine if the function is enabled.
     * @param {string} key - Function identifier
     * @returns {Promise<boolean>} - Whether it is enabled
     */
    this.isEnabled = async (key) => {
      const { until, session } = createFeatureKey(key);

      //Determine session status
      const sessionResult = await sessionStorageShim.get(session);
      const sessionDisabled = sessionResult[session] === "true";
      if (sessionDisabled) {
        return false;
      }

      //Check temporary disable time
      const result = await $.api.storage.local.get(until);
      const disabledUntil = result[until];
      if (disabledUntil && Date.now() < disabledUntil) {
        return false; //Still in the suspension period.
      }

      return true;
    };

    /**
     * Execute function callback when enabled.
     * @param {string} key - Function identifier
     * @param {Function} callback - The function to be executed
     */
    this.runIfEnabled = async (key, callback) => {
      const enabled = await this.isEnabled(key);
      if (enabled) {
        callback();
      } else {
        ext.logger("info", `[FeatureControl] -- "${key}"Current is disabled`);
      }
    };
  };
})(jsu);
