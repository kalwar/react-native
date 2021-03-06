/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule NativeMethodsMixin
 * @flow
 */
'use strict';

var NativeModules = require('NativeModules');
var RCTUIManager = NativeModules.UIManager;
var ReactNativeAttributePayload = require('ReactNativeAttributePayload');
var TextInputState = require('TextInputState');

var findNodeHandle = require('findNodeHandle');
var invariant = require('invariant');

type MeasureOnSuccessCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
  pageX: number,
  pageY: number
) => void

type MeasureLayoutOnSuccessCallback = (
  left: number,
  top: number,
  width: number,
  height: number
) => void


function warnForStyleProps(props, validAttributes) {
  for (var key in validAttributes.style) {
    if (!(validAttributes[key] || props[key] === undefined)) {
      console.error(
        'You are setting the style `{ ' + key + ': ... }` as a prop. You ' +
        'should nest it in a style object. ' +
        'E.g. `{ style: { ' + key + ': ... } }`'
      );
    }
  }
}

var NativeMethodsMixin = {
  measure: function(callback: MeasureOnSuccessCallback) {
    RCTUIManager.measure(
      findNodeHandle(this),
      mountSafeCallback(this, callback)
    );
  },

  measureLayout: function(
    relativeToNativeNode: number,
    onSuccess: MeasureLayoutOnSuccessCallback,
    onFail: () => void /* currently unused */
  ) {
    RCTUIManager.measureLayout(
      findNodeHandle(this),
      relativeToNativeNode,
      mountSafeCallback(this, onFail),
      mountSafeCallback(this, onSuccess)
    );
  },

  /**
   * This function sends props straight to native. They will not participate
   * in future diff process, this means that if you do not include them in the
   * next render, they will remain active.
   */
  setNativeProps: function(nativeProps: Object) {
    if (__DEV__) {
      warnForStyleProps(nativeProps, this.viewConfig.validAttributes);
    }

    var updatePayload = ReactNativeAttributePayload.create(
      nativeProps,
      this.viewConfig.validAttributes
    );

    RCTUIManager.updateView(
      findNodeHandle(this),
      this.viewConfig.uiViewClassName,
      updatePayload
    );
  },

  focus: function() {
    TextInputState.focusTextInput(findNodeHandle(this));
  },

  blur: function() {
    TextInputState.blurTextInput(findNodeHandle(this));
  }
};

function throwOnStylesProp(component, props) {
  if (props.styles !== undefined) {
    var owner = component._owner || null;
    var name = component.constructor.displayName;
    var msg = '`styles` is not a supported property of `' + name + '`, did ' +
      'you mean `style` (singular)?';
    if (owner && owner.constructor && owner.constructor.displayName) {
      msg += '\n\nCheck the `' + owner.constructor.displayName + '` parent ' +
        ' component.';
    }
    throw new Error(msg);
  }
}
if (__DEV__) {
  // hide this from Flow since we can't define these properties outside of
  // __DEV__ without actually implementing them (setting them to undefined
  // isn't allowed by ReactClass)
  var NativeMethodsMixin_DEV = (NativeMethodsMixin: any);
  invariant(
    !NativeMethodsMixin_DEV.componentWillMount &&
    !NativeMethodsMixin_DEV.componentWillReceiveProps,
    'Do not override existing functions.'
  );
  NativeMethodsMixin_DEV.componentWillMount = function () {
    throwOnStylesProp(this, this.props);
  };
  NativeMethodsMixin_DEV.componentWillReceiveProps = function (newProps) {
    throwOnStylesProp(this, newProps);
  };
}

/**
 * In the future, we should cleanup callbacks by cancelling them instead of
 * using this.
 */
var mountSafeCallback = function(context: ReactComponent, callback: ?Function): any {
  return function() {
    if (!callback || (context.isMounted && !context.isMounted())) {
      return;
    }
    return callback.apply(context, arguments);
  };
};

module.exports = NativeMethodsMixin;
