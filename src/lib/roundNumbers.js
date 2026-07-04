// Globally round all numbers to whole numbers wherever they're displayed via toLocaleString()
const originalToLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (...args) {
  return originalToLocaleString.call(Math.round(this), ...args);
};