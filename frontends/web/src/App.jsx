import { AppLayout } from './components/AppLayout';
import { useAppController } from './hooks/useAppController';

function App() {
  const { sidebarProps, mainProps, settingsProps } = useAppController();
  return <AppLayout sidebarProps={sidebarProps} mainProps={mainProps} settingsProps={settingsProps} />;
}

export default App;
