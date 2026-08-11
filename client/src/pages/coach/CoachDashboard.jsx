import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CoachDashboard.css';
import api from '../../services/api';
import Button from '../../components/Button';
import InfoDiv from '../../components/InfoDiv';
import SearchBar from '../../components/SearchBar';
import ActivityDots from '../../components/ActivityDots';
import Table from '../../components/Table';
import Profile from '../../components/Profile';
import ClientCard from '../../components/ClientCard';
import InviteClientModal from '../../components/InviteClientModal';
import { useIsMobile } from '../../hooks/useIsMobile';


function hasLoggedOnDate(logs, targetDate) {
  if (!logs) return false;
  const targetDateString = targetDate.toDateString();
  return logs.some(log => new Date(log.loggedAt).toDateString() === targetDateString);
}

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [coachName, setCoachName] = useState('');
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const isMobile = useIsMobile();


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const coachProfile = await api.get('/coach/profile');
        setCoachName(coachProfile.data.name || coachProfile.data.user?.name || '');
      } catch (err) {
        console.error("error fetching coach profile", err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsObj = await api.get('/coach/clients');
        setClients(clientsObj.data || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClient = async () => {
    setShowInviteDialog(true);
    setInviteLoading(true);
    setInviteError('');
    try {
      const res = await api.post('/coach/invite');
      setInviteLink(res.data.inviteLink);
    } catch (error) {
      console.error(error);
      setInviteError('Could not generate invite link. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch (error) {
      console.error(error);
    }
  };

  const Tcolumns = [
    {
      key: 'client', label: 'CLIENT',
      render: (client) => (
        <div className='profile-cell'>
          <Profile name={client.name} size={"md"} />
        </div>
      )
    },
    {
      key: 'goal', label: 'GOAL',
      render: (client) => (
        <div className='program-cell'>
          {client.goal}
        </div>
      )
    },
    {
      key: 'activity', label: 'ACTIVITY LAST 7 DAYS',
      render: (client) => (
        <div className='activity-cell'>
          <ActivityDots workoutLogs={client.workoutLogs}></ActivityDots>
        </div>
      )
    },
    {
      key: 'action', label: '',
      render: (client) => (
        <div className='action-cell' style={{ color: "var(--accent)" }} onClick={() => navigate(`/coach/clients/${client.id}`)}>
          view
        </div>
      )
    }
  ]
  const Tdata = filteredClients.map((c) => c)
  return (
    <div className="coachDashboard">
      <div className="header">
        <h1>Hi, {coachName || 'Coach'}</h1>
      </div>

      <div className="hero">
        <InfoDiv info={clients.length} infoLabel={"Total clients"}></InfoDiv>
        <InfoDiv info={clients.filter(client => hasLoggedOnDate(client.workoutLogs, new Date())).length} infoLabel={"Logged Today"}></InfoDiv>
      </div>

      <div className="clients-table-header">
        <h1>Clients</h1>
        <div className="search-bar-add-client-wrapper">
          <SearchBar
            type="text"
            placeholder="Search clients"
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          ></SearchBar>
          <div>
            <Button
              variant="primary"
              size="sm"
              className="add-client-btn"
              text="+ Add Client"
              onClick={handleAddClient}
            />
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className='client-card-container'>
          {Tdata.map((client) => (
            <ClientCard onClick={() => navigate(`/coach/clients/${client.id}`)}
              pSize={"md"}
              className="dashboard-client-card"
              key={client.id}
              data={[
                <div className="client-name">{client.name}</div>,
                <div className="client-goal">
                  Goal: {(client.goal ? client.goal.replace(/_/g, ' ') : "not set").toLowerCase()}
                </div>
              ]}
              others={
                <div className="activity-dots-container" style={{ width: "100%" }}>
                  <ActivityDots workoutLogs={client.workoutLogs} />
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <Table columns={Tcolumns} data={Tdata}></Table>
      )}




      {showInviteDialog && (
        <InviteClientModal
          inviteLink={inviteLink}
          inviteLoading={inviteLoading}
          inviteError={inviteError}
          onClose={() => setShowInviteDialog(false)}
          onCopy={handleCopyInviteLink}
        />
      )}
    </div>
  );
}
