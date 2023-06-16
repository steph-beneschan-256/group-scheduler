import './App.css';
import './modal.css';
import { useRef, useState } from 'react';
import FireBaseManager from './firebase';
import SchedulePickerVerII from './SchedulePickerVerII';
import NameWidget from './NameWidget';
import ScheduleDisplay from './ScheduleDisplay';
import TimeFormattingTools from './TimeFormattingTools';

function App() {

  // States related to modal dialogs
  const modalContainerRef = useRef(null);
  const modalInnerRef = useRef(null);
  const [modalContents, setModalContents] = useState(null);
  const [showModal, setShowModal] = useState(null);

  // Group details
  const eventData = useRef(null);
  const [isEventLoaded, setIsEventLoaded] = useState(false);
  const [eventTitle, setEventTitle] = useState(null);
  const [eventPasscode, setEventPasscode] = useState(null);

  // User's name
  const [userName, setUserName] = useState("");

  // Current tab to display
  const [currentTab, setCurrentTab] = useState(0);

  // For each weekday, store time ranges where at least one user is available
  const [totalAvailability, setTotalAvailability] = useState([]);

  // Rank time ranges in descending order of how many users are available during a given range
  const [rankedRanges, setRankedRanges] = useState([]);

  const [rangesWithEveryoneAvailable, setRangesWithEveryoneAvailable] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]);

  // States for controlling text-input elements
  const [newGroupName, setNewGroupName] = useState("New Group");
  const [passcodeInput, setPasscodeInput] = useState("");

  // Whether the user's availability data is currently being saved
  const [isSavingData, setIsSavingData] = useState(false);

  const tabs = [
    {
      name: "My Availability",
      content:
        <div>
          <p>
            Please enter your weekly availability:
          </p>
          <SchedulePickerVerII
          userName={userName}
          saveData={(data) => {
            updatetotalAvailability();
            onSaveButtonClicked(data);
          }}
          isSavingData={isSavingData}
          />
          <NameWidget onNameSet={newName => setUserName(newName)}/>
        </div>
    },
    {
      name: "Group Availability",
      content:
        <div>
          <ScheduleDisplay
          timeRanges={totalAvailability}
          users={groupUsers}
          weekdayLabels={TimeFormattingTools.weekdayLabels}
          timeLabels={TimeFormattingTools.hourLabels}
          editable={false}
          />
          <div>
            <div className="legend-square-transparent"/>: 0% of group available
          </div>
          <div>
            <div className="legend-square-full"/>: 100% of group available
          </div>
          <h4>Timeslots when everyone is available:</h4>
          <>
            {(rangesWithEveryoneAvailable.length > 0) ? (
              <ul>
                {rangesWithEveryoneAvailable.map(range => (
                  <li>
                    {TimeFormattingTools.weekdayLabels.long[range.weekday]}
                    {" from "}
                    {TimeFormattingTools.getTimeLabel([Math.floor(range.start/60), range.start%60])}
                    {" - "}
                    {TimeFormattingTools.getTimeLabel([Math.floor(range.end/60), range.end%60])}
                  </li>
                ))}
              </ul>
            )
          : (
            <div>
              Sorry, but it looks like there are no timeslots for which everyone is available.
            </div>
          )}
          </>
        </div>
    }
  ]

  async function createNewGroup() {
    FireBaseManager.newGroupSchedule(newGroupName).then(newScheduleKey => {
      loadGroupSchedule(newScheduleKey);
    })
  }
  
  async function loadGroupSchedule(scheduleKey) {
    const loadedEventData = await (FireBaseManager.loadScheduleData(scheduleKey));
    if(!loadedEventData) {
      alert("Could not load the event data. Please check that you entered the correct keycode.");
      return;
    }
    eventData.current = loadedEventData;

    setEventTitle(loadedEventData.title);
    setEventPasscode(loadedEventData.passcode);
    setIsEventLoaded(true);

    updatetotalAvailability(loadedEventData.userSchedules);
  }

  async function loadGroupFromPasscode(passcode) {
    const scheduleKey = (await FireBaseManager.getScheduleKeyFromPasscode(passcode)).key;
    loadGroupSchedule(scheduleKey);
  }

  async function onSaveButtonClicked(userScheduleData) {
    if(userName && eventData.current && eventData.current.key) {
      setIsSavingData(true);
      await FireBaseManager.saveUserSchedule(eventData.current.key, userName, userScheduleData);
      FireBaseManager.getUserSchedules(eventData.current.key).then(newData => {
        updatetotalAvailability(newData);
        setIsSavingData(false);
      })
    }
    else
      alert("Please set your name first in order to save your data.");

  }

  function updateAndShowModal(newModalContent) {
    setModalContents(newModalContent);
    setShowModal(true);
  }

  function updatetotalAvailability(newUserSchedules=eventData.current.userSchedules) {
      if(!newUserSchedules)
        return;

      const userNames = Object.keys(newUserSchedules);

      const userAvailabilityMatrices = {};
      userNames.forEach((name) => {
        const matrixStrings = newUserSchedules[name];
        userAvailabilityMatrices[name] = matrixStrings.map(matrixString => Array.from(matrixString).map(x => x==='1'));
      });

      const newTotalAvailability = FireBaseManager.getGroupTimeRangesFromMatrices(userAvailabilityMatrices);
      setTotalAvailability(newTotalAvailability);
      setGroupUsers(userNames);

      updateRankings(newTotalAvailability, userNames);
  }

  async function updateRankings(newTotalAvailability=totalAvailability, newUserList=groupUsers) {
    let rankings = [];
    let everyoneAvailable = []; //ranges where everyone is available
    newTotalAvailability.forEach((weekdayRanges, weekday) => {
      weekdayRanges.forEach(range => {
        if(range.users.length === newUserList.length) {
          everyoneAvailable.push({
            weekday: weekday,
            start: range.start,
            end: range.end
          });
        }
      })
    });
    setRangesWithEveryoneAvailable(everyoneAvailable);
  }

  return (
    <div className="App">
      <header className="App-header">
        <div>
          <img src="clocks.svg" alt=""></img>
          <h1>
            Group Scheduler
          </h1>
        </div>
      </header>
      <div className="App-body">

        

        {
          showModal && <div ref={modalContainerRef} className="modal-container">
            <div ref={modalInnerRef} className="modal-inner">
              
              {modalContents}

              <button onClick={e => {
                modalInnerRef.current.addEventListener("animationend", e => {setShowModal(false)}, "false");
                modalInnerRef.current.style.animationName = "slide-out";
                modalContainerRef.current.style.animationName = "fade-out";
                
              }}>
                Close
              </button>
            </div>
          </div>

        }

        {
          isEventLoaded ? (
            <div>
              <div className="event-info-header">
                <div className="event-title">
                  <p>Group title:</p>
                  <h2>{eventTitle}</h2>
                </div>
                <div>
                  <p>Group passcode:</p>
                  <h3>{eventPasscode}</h3>
                  <button onClick={() => {
                    updateAndShowModal(<div>
                      <p>
                        Passcode:
                      </p>
                      <h2>
                        {eventPasscode}
                      </h2>
                      <p>
                        To view/update this group schedule, a person can go to this website and enter the above passcode. 
                      </p>
                    </div>)
                  }}>
                    Share
                  </button>
                </div>
              </div>
              <div className="event-info-header">
                <p>
                  To invite other people to this group, share the group passcode with them. Then, they can come to this website and enter the passcode in order to access this group.
                </p>
              </div>

              <div className="nav-bar">
                <div className="nav-bar-space"/>

                {tabs.map((tabData, index) => (
                  <>
                    <div onClick={() => {
                      if(!isSavingData)
                        setCurrentTab(index)
                    }}
                    className={`nav-tab ${currentTab === index ? "selected" : ""} ${isSavingData ? "disabled" : ""}`}>
                      {tabData.name}
                    </div>
                    <div className="nav-bar-space"/>
                  </>
                ))}
              </div>
              
              {tabs[currentTab].content}

            </div>
          )
          : (
            <div>
              <h2>
                Welcome to the Group Scheduler!
              </h2>
              <p>
                Just joined a project team and need to coordinate a meeting time with everyone?
                <br/>
                Enter a new name for the group, and everyone will be able to add their availability.
              </p>

              <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}/>
              <button onClick={createNewGroup}>
                Create New Group
              </button>
              <p>Or, access an existing group by entering its passcode:</p>
              <input type="text" maxLength={4}
              value={passcodeInput} onChange={e => setPasscodeInput(e.target.value.toUpperCase())}/>
              <button onClick={() => loadGroupFromPasscode(passcodeInput)}>
                Find Group
              </button>
              
            </div>
          )
        }

      </div>
    </div>
  );
}

export default App;
