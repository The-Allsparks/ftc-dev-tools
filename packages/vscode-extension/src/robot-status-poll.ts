/**
 * Robot-view ADB polling is 15s and only while the sidebar is visible
 * and the editor window is focused. Background Cursor still holding a
 * visible robot view must not keep hitting adb devices.
 */
export function shouldPollRobotStatus(robotViewVisible: boolean, windowFocused: boolean): boolean {
  return robotViewVisible && windowFocused;
}
