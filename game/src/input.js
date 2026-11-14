// Pointer lock, mouse look, and keyboard input binding.
export function createInput(domElement, onLockChange) {
  const keys = new Set();
  const lookDelta = { x: 0, y: 0 };
  const state = {
    firing: false,
    aiming: false,
    scoreboard: false,
    locked: false,
    keys,
  };

  function onKeyDown(e) {
    if (e.code === 'Tab') {
      e.preventDefault();
      state.scoreboard = true;
    }
    keys.add(e.code);
  }

  function onKeyUp(e) {
    if (e.code === 'Tab') {
      e.preventDefault();
      state.scoreboard = false;
    }
    keys.delete(e.code);
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      state.firing = true;
    } else if (e.button === 2) {
      state.aiming = true;
    }
  }

  function onMouseUp(e) {
    if (e.button === 0) {
      state.firing = false;
    } else if (e.button === 2) {
      state.aiming = false;
    }
  }

  function onContextMenu(e) {
    e.preventDefault();
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
  window.addEventListener('contextmenu', onContextMenu);
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
