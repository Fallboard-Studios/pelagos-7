import { Button } from '@/components/ui/controls/Button';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { spawnRobot } from '@/systems/spawnSystem';
import type { ButtonSchema } from '@/types/controls';
import './RobotsTab.css';

const NEW_ROBOT_SCHEMA: ButtonSchema = { id: 'newRobot', type: 'button', humanLabel: '+ New Robot' };

/**
 * The `robots` hub tile's list view, resolving docs/tasks/HUB.md Task 13.
 * Lists every robot in the active locale plus a spawn action; selecting a
 * robot sets selectedRobotId, which ConsolePanel uses to switch to
 * RobotEditorTab within the same tile — no avatar/job/battery card yet,
 * that's Phase 8's job once Battery/Job data exists.
 */
export function RobotsTab() {
  const localeId = getActiveLocaleId();
  const robots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);
  const selectRobot = useUIStore((s) => s.selectRobot);

  function handleNewRobot() {
    const beforeIds = new Set(
      (useLocaleStore.getState().getLocaleById(localeId)?.robots ?? []).map((r) => r.id)
    );
    spawnRobot(localeId);
    const afterRobots = useLocaleStore.getState().getLocaleById(localeId)?.robots ?? [];
    const newRobot = afterRobots.find((r) => !beforeIds.has(r.id));
    if (!newRobot) return;
    selectRobot(newRobot.id);
  }

  return (
    <div className="robots-tab" role="region" aria-label="Robots">
      <div className="robots-tab__new-robot">
        <Button schema={NEW_ROBOT_SCHEMA} onClick={handleNewRobot} />
      </div>
      <ul className="robots-tab__list">
        {robots.map((robot) => {
          // `||`, not `??` — a blank (empty-string) name should fall back to
          // the id too, not just a missing one.
          const schema: ButtonSchema = { id: robot.id, type: 'button', humanLabel: robot.name || robot.id };
          return (
            <li key={robot.id} className="robots-tab__row">
              <Button schema={schema} onClick={() => selectRobot(robot.id)} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default RobotsTab;
