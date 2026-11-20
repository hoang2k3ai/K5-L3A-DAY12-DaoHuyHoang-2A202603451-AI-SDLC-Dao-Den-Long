import test from 'node:test';
import assert from 'node:assert/strict';
import { moveFromKeys } from '../src/input.js';

// Contract transform (cam_yaw_deg = deg).
function transform(x, z, deg) {
  const theta = (deg * Math.PI) / 180;
  return [x * Math.cos(theta) + z * Math.sin(theta), -x * Math.sin(theta) + z * Math.cos(theta)];
}

test('strafe keys follow the camera right vector for every yaw', () => {
  for (const deg of [0, 30, 90, 135, -60, 180, 270]) {
    const theta = (deg * Math.PI) / 180;
    // Third-person camera looks along (sinθ, cosθ); its screen-right is (-cosθ, sinθ).
    const cameraRight = [-Math.cos(theta), Math.sin(theta)];
    const [dx, dz] = transform(...moveFromKeys(0, 1), deg); // press D only
    assert.ok(Math.abs(dx - cameraRight[0]) < 1e-9, `D x at yaw ${deg}`);
    assert.ok(Math.abs(dz - cameraRight[1]) < 1e-9, `D z at yaw ${deg}`);

    const [ax, az] = transform(...moveFromKeys(0, -1), deg); // press A only
    assert.ok(Math.abs(ax + cameraRight[0]) < 1e-9, `A x at yaw ${deg}`);
    assert.ok(Math.abs(az + cameraRight[1]) < 1e-9, `A z at yaw ${deg}`);
  }
});

test('W walks away from the camera along the view direction', () => {
  for (const deg of [0, 45, 90, -120, 200]) {
    const theta = (deg * Math.PI) / 180;
    const [wx, wz] = transform(...moveFromKeys(1, 0), deg);
    assert.ok(Math.abs(wx - Math.sin(theta)) < 1e-9, `W x at yaw ${deg}`);
    assert.ok(Math.abs(wz - Math.cos(theta)) < 1e-9, `W z at yaw ${deg}`);
  }
});
