import { useEffect } from 'react';
import { useGameStore } from './store/gameStore.js';
import { LobbyScreen } from './components/lobby/LobbyScreen.jsx';
import { PartyPage } from './components/party/PartyPage.jsx';
import { BattleScreen } from './components/battle/BattleScreen.jsx';

export default function App() {
  const { screen, initSocket } = useGameStore();
  useEffect(() => { initSocket(); }, []);
  switch (screen) {
    case 'party':   return <PartyPage />;
    case 'battle':  return <BattleScreen />;
    default:        return <LobbyScreen />;
  }
}