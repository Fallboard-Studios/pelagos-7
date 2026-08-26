import { Button } from '@/components/ui/controls/Button';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import type { ButtonSchema } from '@/types/controls';
import './RobotsTab.css';

/**
 * The `robots` hub tile's list view, resolving docs/tasks/HUB.md Task 13.
 * Lists every robot in the active locale; selecting a robot sets
 * selectedRobotId, which ConsolePanel uses to switch to RobotEditorTab
 * within the same tile. Read-only — the roster is fixed at 12, created once
 * at locale load (Roadmap Phase 7); there is no manual spawn action anymore.
 * No avatar/job/battery card yet, that's Phase 8's job.
 */
export function RobotsTab() {
  const localeId = getActiveLocaleId();
  const robots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);
  const selectRobot = useUIStore((s) => s.selectRobot);

  return (
    <div className="robots-tab" role="region" aria-label="Robots">
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
