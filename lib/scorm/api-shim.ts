export function buildScormApiScript(packageId: string): string {
  const safePackageId = JSON.stringify(packageId);

  return `
(function () {
  const packageId = ${safePackageId};
  const state12 = new Map();
  const state2004 = new Map();
  const lastError12 = { code: "0", message: "No error" };
  const lastError2004 = { code: "0", message: "No error" };

  function emit(api, method, args, result) {
    try {
      window.dispatchEvent(
        new CustomEvent("scorm-api-call", {
          detail: { packageId, api, method, args, result }
        })
      );
    } catch (error) {
      console.warn("SCORM debug emit failed", error);
    }
  }

  function wrapAPI(methods, apiName, state, lastError) {
    const api = {};
    Object.keys(methods).forEach((methodName) => {
      api[methodName] = function (...args) {
        const result = methods[methodName].apply(
          null,
          [state, lastError, ...args]
        );
        emit(apiName, methodName, args, result);
        return result;
      };
    });
    return api;
  }

  const api12 = wrapAPI(
    {
      Initialize(state, lastError) {
        lastError.code = "0";
        return "true";
      },
      Terminate() {
        return "true";
      },
      GetValue(state, lastError, key) {
        lastError.code = "0";
        return state.get(key) ?? "";
      },
      SetValue(state, lastError, key, value) {
        state.set(key, value);
        lastError.code = "0";
        return "true";
      },
      Commit() {
        return "true";
      },
      GetLastError(state, lastError) {
        return lastError.code;
      },
      GetErrorString(state, lastError, code) {
        return code === "0" ? "No error" : "General error";
      },
      GetDiagnostic(state, lastError) {
        return "";
      }
    },
    "SCORM12",
    state12,
    lastError12
  );

  const api2004 = wrapAPI(
    {
      Initialize(state, lastError) {
        lastError.code = "0";
        return "true";
      },
      Terminate() {
        return "true";
      },
      GetValue(state, lastError, key) {
        lastError.code = "0";
        return state.get(key) ?? "";
      },
      SetValue(state, lastError, key, value) {
        state.set(key, value);
        lastError.code = "0";
        return "true";
      },
      Commit() {
        return "true";
      },
      GetLastError(state, lastError) {
        return lastError.code;
      },
      GetErrorString(state, lastError, code) {
        return code === "0" ? "No error" : "General error";
      },
      GetDiagnostic() {
        return "";
      }
    },
    "SCORM2004",
    state2004,
    lastError2004
  );

  if (!window.API) {
    window.API = api12;
  }
  if (!window.API_1484_11) {
    window.API_1484_11 = api2004;
  }
})();`;
}

