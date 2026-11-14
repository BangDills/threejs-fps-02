// Pointer lock, mouse look, and keyboard input binding.
export function createInput(domElement, onLockChange) {
  const keys = new Set();
  const lookDelta = { x: 0, y: 0 };
  const state = {
    firing: false,
    locked: false,
    keys,
  };

  function onKeyDown(e) {
    keys.add(e.code);
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      state.firing = true;
    }
  }

  function onMouseUp(e) {
    if (e.button === 0) {
      state.firing = false;
    }
  }

  function onMouseMove(e) {
    if (document.pointerLockElement === domElement) {
      lookDelta.x += e.movementX || 0;
      lookDelta.y += e.movementY || 0;
    }
  }

  function onPointerLockChange() {
    state.locked = (document.pointerLockElement === domElement);
    if (onLockChange) onLockChange(state.locked);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  function requestLock() {
    domElement.requestPointerLock();
  }

  function takeLook() {
    const x = lookDelta.x;
    const y = lookDelta.y;
    lookDelta.x = 0;
    lookDelta.y = 0;
    return { x, y };
  }

  return {
    state,
    requestLock,
    takeLook,
  };
}
