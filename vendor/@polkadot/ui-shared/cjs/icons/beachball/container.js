'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.container = container;
function container(diameter, background = 'white', className = '', _style = {}) {
  const element = document.createElement('div');
  const style = Object.assign(
    {
      background,
      borderRadius: `${diameter / 2}px`,
      display: 'inline-block',
      height: `${diameter}px`,
      margin: '0px',
      overflow: 'hidden',
      padding: '0px',
      width: `${diameter}px`,
    },
    _style
  );
  element.className = className;
  element.style.background = background;
  Object.keys(style).forEach((key) => {
    element.style[key] = style[key];
  });
  return element;
}
