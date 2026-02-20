export enum ActorType {
  FACTORY = 'FACTORY',
}

export interface Actor {
  id: string;                    // Used as procedural generation seed
  type: ActorType;
  position: { x: number; y: number };
  rotation?: number;
  scale?: number;
  isActive: boolean;
  cooldownRemaining: number;     // Measures until next activation
  config?: {
    robotBlueprint?: string;
    productionInterval?: number;
  };
}
