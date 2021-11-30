/* eslint-disable */
export default function runConfetti() {
  let isRunning = false;

  let COLORS, Confetti, NUM_CONFETTI, PI_2, canvas, confetti, context, drawCircle, i, range, resizeWindow, xpos;

  NUM_CONFETTI = 350;

  COLORS = [
    [85, 71, 106],
    [174, 61, 99],
    [219, 56, 83],
    [244, 92, 68],
    [248, 182, 70],
  ];

  PI_2 = 2 * Math.PI;

  canvas = document.getElementById('confetti');

  context = canvas.getContext('2d');

  let w = 0;
  let h = 0;

  resizeWindow = function () {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  };

  window.addEventListener('resize', resizeWindow, false);

  resizeWindow();

  range = function (a, b) {
    return (b - a) * Math.random() + a;
  };

  drawCircle = function (x, y, r, style) {
    context.beginPath();
    context.arc(x, y, r, 0, PI_2, false);
    context.fillStyle = style;
    return context.fill();
  };

  xpos = 0.5;

  document.onmousemove = function (e) {
    return (xpos = e.pageX / w);
  };

  window.requestAnimationFrame = (function () {
    return (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (callback) {
        return window.setTimeout(callback, 1000 / 60);
      }
    );
  })();

  Confetti = (function () {
    function Confetti() {
      this.style = COLORS[~~range(0, 5)];
      this.rgb = 'rgba(' + this.style[0] + ',' + this.style[1] + ',' + this.style[2];
      this.r = ~~range(2, 6);
      this.r2 = 2 * this.r;
      this.replace();
    }

    Confetti.prototype.replace = function () {
      this.opacity = 0;
      this.dop = 0.03 * range(1, 4);
      this.x = range(-this.r2, w - this.r2);
      this.y = range(-20, h - this.r2);
      this.xmax = w - this.r;
      this.ymax = h - this.r;
      this.vx = range(0, 2) + 8 * xpos - 5;
      return (this.vy = 0.7 * this.r + range(-1, 1));
    };

    Confetti.prototype.draw = function () {
      let _ref;
      this.x += this.vx;
      this.y += this.vy;
      this.opacity += this.dop;
      if (this.opacity > 1) {
        this.opacity = 1;
        this.dop *= -1;
      }
      if (this.opacity < 0 || this.y > this.ymax) {
        this.replace();
      }
      if (!((_ref = this.x) > 0 && _ref < this.xmax)) {
        this.x = (this.x + this.xmax) % this.xmax;
      }
      return drawCircle(~~this.x, ~~this.y, this.r, this.rgb + ',' + this.opacity + ')');
    };

    return Confetti;
  })();

  confetti = (function () {
    let _i, _results;
    _results = [];
    for (i = _i = 1; NUM_CONFETTI >= 1 ? _i <= NUM_CONFETTI : _i >= NUM_CONFETTI; i = NUM_CONFETTI >= 1 ? ++_i : --_i) {
      _results.push(new Confetti());
    }
    return _results;
  })();

  const step = function () {
    let c, _i, _len, _results;

    if (!isRunning) return;

    requestAnimationFrame(step);

    context.clearRect(0, 0, w, h);
    _results = [];
    for (_i = 0, _len = confetti.length; _i < _len; _i++) {
      c = confetti[_i];
      _results.push(c.draw());
    }
    return _results;
  };

  const run = () => {
    isRunning = true;
    step();
  }

  const stop = () => {
    isRunning = false;
  }

  return { run, stop };
}