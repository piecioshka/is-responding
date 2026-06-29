/**
 * Resolve after a given amount of time.
 *
 * @param time Number of milliseconds to wait.
 */
export function delay(time = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}
