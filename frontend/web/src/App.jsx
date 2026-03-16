import { AppLayout } from './components/AppLayout';
import { useAppViewModel } from './hooks/useAppViewModel';

function App() {
  const { sidebarProps, mainProps, settingsProps } = useAppViewModel();
  return <AppLayout sidebarProps={sidebarProps} mainProps={mainProps} settingsProps={settingsProps} />;
}

export default App;
