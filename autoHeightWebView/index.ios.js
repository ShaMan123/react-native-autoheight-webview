'use strict';

import React, { PureComponent } from 'react';

import { Animated, Dimensions, StyleSheet, ViewPropTypes, WebView } from 'react-native';

import PropTypes from 'prop-types';

import { getScript, onHeightUpdated, onWidthUpdated, onSizeUpdated, domMutationObserveScript } from './common.js';

const screenWidth = Dimensions.get('window').width;

export default class AutoHeightWebView extends PureComponent {
  static propTypes = {
    hasIframe: PropTypes.bool,
    source: WebView.propTypes.source,
      onHeightUpdated: PropTypes.func,
      onWidthUpdated: PropTypes.func,
      onSizeUpdated: PropTypes.func,
      shouldResizeWidth: PropTypes.bool,
    customScript: PropTypes.string,
    customStyle: PropTypes.string,
    enableAnimation: PropTypes.bool,
    // if set to true may cause some layout issues (smaller font size)
    scalesPageToFit: PropTypes.bool,
    // only works on enable animation
    animationDuration: PropTypes.number,
    // offset of rn webview margin
      heightOffset: PropTypes.number,
      widthOffset: PropTypes.number,
    style: ViewPropTypes.style,
    //  rn WebView callback
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onLoadStart: PropTypes.func,
    onLoadEnd: PropTypes.func,
    onShouldStartLoadWithRequest: PropTypes.func,
    // add web/files... to project root
    files: PropTypes.arrayOf(
      PropTypes.shape({
        href: PropTypes.string,
        type: PropTypes.string,
        rel: PropTypes.string
      })
    )
  };

  static defaultProps = {
    scalesPageToFit: false,
    enableAnimation: true,
    animationDuration: 555,
      heightOffset: 12,
      widthOffset: 12,
      shouldResizeWidth: false
  };

  constructor(props) {
    super(props);
    props.enableAnimation && (this.opacityAnimatedValue = new Animated.Value(0));
    this.state = {
        height: 0,
        //heightOffset: 0, //?? I added this
        width: screenWidth,
        //widthOffset: 0,
      script: getScript(props, baseScript, iframeBaseScript)
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ script: getScript(nextProps, baseScript, iframeBaseScript) });
  }

    handleNavigationStateChange = navState => {
        var [width, height] = navState.title.split(',');
        width = Number(width);
        height = Number(height);
        const { enableAnimation, animationDuration } = this.props;
        if (height && height !== this.state.height) {       // ??? add to logic ??? width && width !== this.state.width
            enableAnimation && this.opacityAnimatedValue.setValue(0);
            this.setState({ height, width }, () => {
                enableAnimation
                    ? Animated.timing(this.opacityAnimatedValue, {
                        toValue: 1,
                        duration: animationDuration
                    }).start(() => onSizeUpdated({ height, width }, this.props))
                    : onSizeUpdated({ height, width }, this.props);
            });
        }
  };

  getWebView = webView => (this.webView = webView);

  stopLoading() {
    this.webView.stopLoading();
  }

  render() {
    const { height, width, script } = this.state;
    const {
      onError,
      onLoad,
      onLoadStart,
      onLoadEnd,
      onShouldStartLoadWithRequest,
      scalesPageToFit,
      enableAnimation,
      source,
      heightOffset,
      widthOffset,
      customScript,
      style
    } = this.props;
    const webViewSource = Object.assign({}, source, { baseUrl: 'web/' });
    return (
      <Animated.View
        style={[
          styles.container,
          {
            opacity: enableAnimation ? this.opacityAnimatedValue : 1,
              height: height + heightOffset,
              width: width + widthOffset
          },
          style
        ]}
      >
        <WebView
          ref={this.getWebView}
          onError={onError}
          onLoad={onLoad}
          onLoadStart={onLoadStart}
          onLoadEnd={onLoadEnd}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          style={styles.webView}
          injectedJavaScript={script + customScript}
          scrollEnabled={false}
          scalesPageToFit={scalesPageToFit}
          source={webViewSource}
          onNavigationStateChange={this.handleNavigationStateChange}
        />
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent'
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent'
  }
});

const commonScript = `
    updateSize();
    window.addEventListener('load', updateSize);
    window.addEventListener('resize', updateSize);
    `;

const _getter = `
    function getHeight(height) {
      if(height < 1) {
        return document.body.offsetHeight;
      }
      return height;
    }
    function getWidth(width) {
      if(width < 1) {
        return document.body.clientWidth; // maybe should be .offsetWidth ??
      }
      return width;
    }
    `;
const baseScript = `
    ;
    ${_getter}
    (function () {
        var i = 0;
        var height = 0;
        var width = ${screenWidth};
        var wrapper = document.createElement('div');
        wrapper.id = 'height-wrapper';
        while (document.body.firstChild instanceof Node) {
            wrapper.appendChild(document.body.firstChild);
        }
        document.body.appendChild(wrapper);
        function updateSize() {
            var rect = document.body.firstElementChild.getBoundingClientRect().toJSON();
            var newWidth = Math.round(rect.width);
            var newHeight = Math.round(rect.height);
            if(newHeight !== height) {
                //height = getHeight(wrapper.clientHeight);
                //width = getWidth(wrapper.clientWidth);
                document.title = newWidth + ',' + newHeight;
                window.location.hash = ++i;
            }
        }
        ${commonScript}
        ${domMutationObserveScript}
    } ());
    `;

const iframeBaseScript = `
    ;
    ${_getter}
    (function () {
        var i = 0;
        var height = 0;
        var width = ${screenWidth};
        function updateSize() {
            var rect = document.body.firstElementChild.getBoundingClientRect().toJSON();
            var newWidth = Math.round(rect.width);
            var newHeight = Math.round(rect.height);
            if(newHeight !== height) {
                //height = getHeight(document.body.firstChild.clientHeight);
                //width = getWidth(document.body.firstChild.clientHeight);
                document.title = newWidth + ',' + newHeight;
                window.location.hash = ++i;
            }
        }
        ${commonScript}
        ${domMutationObserveScript}
    } ());
    `;
