import { router } from 'expo-router';
import { create } from 'zustand';

import { screenIncomingCall } from '@/features/calls/guard';
import { processIncoming } from '@/features/detection/pipeline';
import { useUi } from '@/store/ui';

import { SCENARIOS, type Scenario } from './scenarios';

interface DemoState {
  runningId: string | null;
  /** Step progress of the running scenario, for the control room. */
  step: number;
}

export const useDemo = create<DemoState>(() => ({ runningId: null, step: 0 }));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runScenario(scenario: Scenario): Promise<void> {
  if (useDemo.getState().runningId) return;
  useDemo.setState({ runningId: scenario.id, step: 0 });
  let alerts = 0;

  try {
    for (const [index, step] of scenario.steps.entries()) {
      await wait(step.delayMs);
      useDemo.setState({ step: index + 1 });

      if (step.kind === 'message') {
        const check = await processIncoming({ ...step.item, receivedAt: Date.now() });
        if (check) alerts++;
      } else if (step.kind === 'call') {
        const result = await screenIncomingCall(step.number);
        if (result === 'blocked') alerts++;
        else useUi.getState().showToast(`${step.number} is not on the blocklist yet: the call would ring.`, 'warn');
      } else {
        router.push({ pathname: '/listener', params: { demo: '1', number: step.number } });
        alerts++;
      }
    }
    if (alerts === 0) {
      useUi.getState().showToast(`${scenario.steps.length} genuine messages checked. No alert raised.`, 'safe');
    }
  } finally {
    useDemo.setState({ runningId: null, step: 0 });
  }
}

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id);
