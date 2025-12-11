import { AppLayout } from './components/AppLayout';
import { useAppProps } from './hooks/useAppProps';

function App() {
  const { sidebarProps, mainProps, settingsProps } = useAppProps();
  return <AppLayout sidebarProps={sidebarProps} mainProps={mainProps} settingsProps={settingsProps} />;
}

export default App;
