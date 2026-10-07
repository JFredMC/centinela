/// <reference lib="webworker" />
import type { DeskState } from '@centinela/fraud-engine';
import type { DeskAction } from './desk-actions';
import { DeskRunner } from './desk-runner';

type InMsg = { type: 'init'; state: DeskState } | { type: 'action'; action: DeskAction };

let runner: DeskRunner | null = null;

addEventListener('message', ({ data }: MessageEvent<InMsg>) => {
  if (data.type === 'init') {
    runner?.stop();
    runner = new DeskRunner(data.state, (state) => postMessage({ type: 'state', state }));
    runner.start();
  } else {
    runner?.dispatch(data.action);
  }
});
