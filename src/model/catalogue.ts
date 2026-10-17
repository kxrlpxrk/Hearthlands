export const catalogue = [
  { kind: 'longhouse', name: 'Longhouse', group: 'Homes & community', width: 4, height: 2, symbol: 'roof' },
  { kind: 'cottage', name: 'House / cottage', group: 'Homes & community', width: 2, height: 2, symbol: 'roof' },
  { kind: 'townhall', name: 'Town hall', group: 'Homes & community', width: 4, height: 3, symbol: 'hall' },
  { kind: 'tavern', name: 'Tavern', group: 'Homes & community', width: 3, height: 2, symbol: 'barrel' },
  { kind: 'blacksmith', name: 'Blacksmith', group: 'Trade & industry', width: 3, height: 2, symbol: 'anvil' },
  { kind: 'market', name: 'Market / shop', group: 'Trade & industry', width: 3, height: 2, symbol: 'market' },
  { kind: 'farm', name: 'Farm / barn', group: 'Trade & industry', width: 4, height: 3, symbol: 'farm' },
  { kind: 'sawmill', name: 'Sawmill', group: 'Trade & industry', width: 3, height: 3, symbol: 'logs' },
  { kind: 'mill', name: 'Watermill / windmill', group: 'Trade & industry', width: 3, height: 3, symbol: 'mill' },
  { kind: 'warehouse', name: 'Warehouse', group: 'Trade & industry', width: 4, height: 3, symbol: 'crates' },
  { kind: 'storehouse', name: 'Storehouse', group: 'Trade & industry', width: 2, height: 2, symbol: 'crates' },
  { kind: 'fishinghut', name: 'Fishing hut', group: 'Waterfront', width: 2, height: 2, symbol: 'fish' },
  { kind: 'harbour', name: 'Harbour / dock', group: 'Waterfront', width: 5, height: 3, symbol: 'dock' },
  { kind: 'bridge', name: 'Bridge', group: 'Waterfront', width: 4, height: 2, symbol: 'bridge' },
  { kind: 'shipyard', name: 'Shipyard', group: 'Waterfront', width: 5, height: 3, symbol: 'ship' },
  { kind: 'watchtower', name: 'Watchtower', group: 'Defence & horses', width: 2, height: 2, symbol: 'tower' },
  { kind: 'palisade', name: 'Palisade / gate', group: 'Defence & horses', width: 4, height: 1, symbol: 'gate' },
  { kind: 'barracks', name: 'Barracks', group: 'Defence & horses', width: 4, height: 3, symbol: 'shield' },
  { kind: 'stables', name: 'Stables', group: 'Defence & horses', width: 4, height: 2, symbol: 'stalls' },
] as const;
export type BuildingKind = typeof catalogue[number]['kind'];
export const buildingDefinition = (kind: BuildingKind) => catalogue.find(b => b.kind === kind)!;
