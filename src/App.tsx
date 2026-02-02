import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import Dashboard from '@/pages/Dashboard'
import Calls from '@/pages/Calls'
import CallDetail from '@/pages/CallDetail'
import Talkgroups from '@/pages/Talkgroups'
import TalkgroupDetail from '@/pages/TalkgroupDetail'
import Units from '@/pages/Units'
import UnitDetail from '@/pages/UnitDetail'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calls" element={<Calls />} />
        <Route path="/calls/:id" element={<CallDetail />} />
        <Route path="/talkgroups" element={<Talkgroups />} />
        <Route path="/talkgroups/:id" element={<TalkgroupDetail />} />
        <Route path="/units" element={<Units />} />
        <Route path="/units/:id" element={<UnitDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
