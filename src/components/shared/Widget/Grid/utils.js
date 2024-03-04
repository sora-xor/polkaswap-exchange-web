// Implementation of new responsive grid
// Function taken from:
// vue-grid-layout/src/helpers/utils.js
// vue-grid-layout/src/helpers/responsiveUtils.js

// original
const getFirstCollision = (layout, layoutItem) => {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (collides(layout[i], layoutItem)) return layout[i];
  }
};

// original
const getStatics = (layout) => {
  return layout.filter((l) => l.static);
};

// changed
const sortLayoutItemsByRowCol = (layout) => {
  return [].concat(layout).sort(function (a, b) {
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) {
      return 1;
    }
    if (a.y === b.y && a.x === b.x) return 0;
    return -1;
  });
};

// original
const collides = (l1, l2) => {
  if (l1 === l2) return false; // same element
  if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
  if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
  if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
  if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
  return true; // boxes overlap
};

// changed
const compactItem = (compareWith, l, verticalCompact, cols) => {
  let collide;
  while ((collide = getFirstCollision(compareWith, l))) {
    l.x = collide.x + collide.w;
    if (l.x + l.w > cols) {
      l.x = 0;
      l.y = collide.y + collide.h;
    }
  }

  if (verticalCompact) {
    do {
      l.y--;
    } while (l.y > 0 && !getFirstCollision(compareWith, l));
    l.y++;
  }

  return l;
};

// changed
const correctBounds = (layout, cols) => {
  const collidesWith = getStatics(layout);
  for (let i = 0, len = layout.length; i < len; i++) {
    const l = layout[i];
    if (l.x + l.w > cols) l.x = 0;
    if (l.w > cols) {
      l.w = cols;
    }

    let collide;
    while ((collide = getFirstCollision(collidesWith, l))) {
      l.x = collide.x + collide.w;
      if (l.x + l.w > cols) {
        l.x = 0;
        l.y = collide.y + collide.h;
      }
    }

    if (!l.static) collidesWith.push(l);
  }
  return layout;
};

// changed
const compact = (layout, cols, verticalCompact) => {
  const compareWith = getStatics(layout);
  const sorted = sortLayoutItemsByRowCol(layout);
  const out = Array(layout.length);

  for (let i = 0, len = sorted.length; i < len; i++) {
    let l = sorted[i];

    if (!l.static) {
      l = compactItem(compareWith, l, verticalCompact, cols);

      compareWith.push(l);
    }

    out[layout.indexOf(l)] = l;

    l.moved = false;
  }

  return out;
};

// original
const cloneLayoutItem = (layoutItem) => {
  return JSON.parse(JSON.stringify(layoutItem));
};

// original
const cloneLayout = (layout) => {
  const newLayout = Array(layout.length);
  for (let i = 0, len = layout.length; i < len; i++) {
    newLayout[i] = cloneLayoutItem(layout[i]);
  }
  return newLayout;
};

// new
export const compactItems = (layout, cols, verticalCompact) => {
  const clone = cloneLayout(layout);
  const correctedBounds = correctBounds(clone, cols);
  return compact(correctedBounds, cols, verticalCompact);
};
