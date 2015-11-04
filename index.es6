import promisescript from 'promisescript';
import assign from 'lodash.assign';

export default class OminturePlugin {

  constructor(config) {
    this.config = config;
  }

  get eventHandlers() {
    return {
      click: this.click.bind(this),
      pageview: this.pageview.bind(this),
    };
  }

  ensureScriptHasLoaded() {
    if (!this.script) {
      this.script = promisescript({
        url: this.config.externalScript,
        type: 'script',
      }).then(() => {
        if (typeof window === 'undefined' || !window.s_gi) {
          return false;
        }
        const props = {};
        for (let i = 1; i < 50; ++i) {
          props['prop' + i] = '';
        }
        this.trackingObject = assign(
          window.s_gi(this.config.account),
          this.config.initialConfig
        );
      }).catch(function(e) {
        console.error('An error loading or executing Omniture has occured: ', e.message);
      });
    }
    return this.script;
  }

  generatePayload(payload, eventName) {
    const eventHandler = this.config.eventHandlers[eventName];
    let props = {};
    if (payload && payload.i13nNode && payload.i13nNode.getMergedModel) {
      props = payload.i13nNode.getMergedModel();
    }
    if (eventHandler) {
      return eventHandler(props);
    }
    return props;
  }

  /* eslint-disable no-unused-vars */
  pageview(payload, callback) {
    return this.ensureScriptHasLoaded().then(() => (
      this.track(this.generatePayload(payload, 'pageview'), callback)
    ));
  }

  click(payload, callback) {
    return this.ensureScriptHasLoaded().then(() => (
      this.trackLink(this.generatePayload(payload, 'click'), callback)
    ));
  }

  track(additionalTrackingProps, callback) {
    const newTrackingObject = assign(
      this.trackingObject,
      additionalTrackingProps
    );
    // `t` is Omniture's Track function.
    const omnitureTrackingPixel = newTrackingObject.t();
    if (omnitureTrackingPixel && typeof window !== 'undefined' && window.document) {
      window.document.write(omnitureTrackingPixel);
    }
    const promise = Promise.resolve();
    if (callback) {
      promise.then(callback);
    }
    return promise;
  }

  trackLink(additionalTrackingProps, callback) {
    return new Promise((resolve) => {
      const newTrackingObject = assign(
        this.trackingObject,
        additionalTrackingProps
      );
      // `tl` is Omniture's TrackLink function.
      // TODO: linkType and linkName are mandatory, pls add a check.
      newTrackingObject.tl(
        true,
        newTrackingObject.linkType,
        newTrackingObject.linkName,
        newTrackingObject.variableOverrides,
        () => {
          if (callback) {
            callback();
          }
          resolve();
        },
      );
    });
  }

};
