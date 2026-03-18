import { useEffect } from 'react';
import { useGameStore } from './store/gameStore.js';
import { LobbyScreen } from './components/lobby/LobbyScreen.jsx';
import { PartyBuilderScreen } from './components/lobby/PartyBuilderScreen.jsx';
import { GridBuilderScreen } from './components/grid/GridBuilderScreen.jsx';
import { BattleScreen } from './components/battle/BattleScreen.jsx';

export default function App() {
  const { screen, initSocket } = useGameStore();

  useEffect(() => {
    initSocket();
  }, []);

  switch (screen) {
    case 'party_builder': return <PartyBuilderScreen />;
    case 'grid_builder':  return <GridBuilderScreen />;
    case 'battle':        return <BattleScreen />;
    default:              return <LobbyScreen />;
  }
}
