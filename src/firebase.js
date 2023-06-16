import { initializeApp } from "firebase/app";

import {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword} from "firebase/auth";
import {getDatabase, ref, child, get, push, update, runTransaction} from "firebase/database";

// TODO: move configuration data for privacy
const firebaseConfig = {
    apiKey: "AIzaSyA0x-Pe9pCXge21feHubhrobL7uuxkIs1M",
    authDomain: "sesl-s2-l5-sbeneschan.firebaseapp.com",
    databaseURL: "https://sesl-s2-l5-sbeneschan-default-rtdb.firebaseio.com",
    projectId: "sesl-s2-l5-sbeneschan",
    storageBucket: "sesl-s2-l5-sbeneschan.appspot.com",
    messagingSenderId: "721908967461",
    appId: "1:721908967461:web:5609386b397361711137cc"
};
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

class FireBaseManager {
    static async newAccount(emailAddr, password) {
        const userCredential = await createUserWithEmailAndPassword(auth, emailAddr, password);
        return userCredential.user;
    }
    static async signIn(emailAddr, password) {
        const userCredential = await signInWithEmailAndPassword(auth, emailAddr, password);
        return userCredential.user;
    }
    static async getGroupSchedule() {
        const snapshot = await get(child(ref(db), "groupSchedules"));
        console.log(snapshot.val());
        return snapshot.val();
    }
    static async newGroupSchedule(newTitle="New Group Schedule") {
        const newKey = push(child(ref(db), "groupSchedules")).key;
        const newPasscodeKey = await FireBaseManager.getPasscodeKey();
        console.log(newPasscodeKey);

        const passcode = FireBaseManager.convertToPasscode(newPasscodeKey);
        console.log(passcode);
        console.log(FireBaseManager.decodePasscode(passcode));

        //const passcode = await this.getPasscodeKey();
        const updates = {};
        updates['/groupSchedules/' + newKey] = {
            title: `${newTitle}`,
            userSchedules: {},
            passcode: passcode
        };
        updates['/schedulesByPasscode/' + newPasscodeKey] = {
            key: newKey
        };
        const updateResponse = await update(ref(db), updates);
        return newKey;

    }

    /*
    Attempting to implement a Fibnoacci LSFR as described by the below Wikipedia article:
    https://en.wikipedia.org/wiki/Linear-feedback_shift_register

    This is to enable the application to produce all numbers in the range [1, 2^16-1] in a random order without (?) repetition; each number is to be assigned to an individual group schedule, to create a 16-bit passcode that can be displayed to the user as a simple letter sequence

    The database stores the current seed in the passcodeSeed attribute
    */

    static shiftSeed(seed) {
        // (Not entirely sure how/why this works...)
        const newBit = (seed ^ (seed >> 1) ^ (seed >> 3) ^ (seed >> 12)) & 1;
        return (seed >> 1) | (newBit << 15); // Delete the rightmost bit, then append the new bit to the beginning
    }

    static convertToPasscode(seed) {
        return Array(4).fill(0).map(
            (_, index) => {
                const x = (seed >> (4*index)) & 15; //15 in binary = 1111
                switch(x) {
                    case 13:
                        return 'K';
                    case 14:
                        return 'Q';
                    case 15:
                        return 'M';
                    default:
                        return String.fromCharCode(66 + 2*x);
                }
            }
        ).join('');
    }

    static decodePasscode(passcode) {
        if(!/^[BDFHJKLMNPQRTVXZ]{4}$/.exec(passcode))
            return null; //invalid passcode
        let b = Array.from(passcode).map((c) => {
            switch(c) {
                case 'K':
                    return 13;
                case 'Q':
                    return 14;
                case 'M':
                    return 15;
                default:
                    const charCode = c.charCodeAt(0);
                    return (charCode - 66)/2;                    
            }
        } );
        let decoded = 0;
        b.forEach((v, i) => {
            decoded = (v << 4*i) + decoded;
        });
        return decoded;
    }

    static async getPasscodeKey() {
        const codeSeedRef = ref(db, "/passcodeSeed/");
        let prevSeed;
        await runTransaction(codeSeedRef, (seed) => {
            prevSeed = seed;
            console.log(prevSeed);
            seed = FireBaseManager.shiftSeed(seed);
            return seed;
        });
        return prevSeed;
    }

    static async getUserSchedules(scheduleKey) {
        const scheduleSnapshot = await get(child(ref(db), "groupSchedules/" + scheduleKey + "/userSchedules"));
        if(!scheduleSnapshot.exists())
            return null;
        console.log(scheduleSnapshot.val());
        return {
            ...scheduleSnapshot.val(),
        };
    }

    static async getScheduleKeyFromPasscode(passcode) {
        const decoded = FireBaseManager.decodePasscode(passcode);
        if(!decoded)
            return null;
        const snapshot = await get(child(ref(db), "schedulesByPasscode/" + decoded.toString()));
        if(!snapshot.exists())
            return null;
        return snapshot.val();
    }

    static async loadScheduleData(scheduleKey) {
        const scheduleSnapshot = await get(child(ref(db), "groupSchedules/" + scheduleKey));
        if(!scheduleSnapshot.exists())
            return null;
        console.log(scheduleSnapshot.val());
        return {
            ...scheduleSnapshot.val(),
            key: scheduleKey
        };
    }

    static async getScheduleByPasscode(passcode) {
        const decoded = FireBaseManager.decodePasscode(passcode);
        if(!decoded)
            return null;
        const snapshot = await get(child(ref(db), "schedulesByPasscode/" + decoded.toString()));
        if(!snapshot.exists())
            return null;
        const scheduleKey = snapshot.val();
        console.log(scheduleKey);

        const scheduleSnapshot = await get(child(ref(db), "groupSchedules/" + scheduleKey));
        if(!scheduleSnapshot.exists())
            return null;
        console.log(scheduleSnapshot.val());
        return {
            ...scheduleSnapshot.val(),
            key: scheduleKey,
            passcode: passcode
        };
    }

    //save a user schedule as part of a group schedule
    static async saveUserSchedule(groupScheduleID, userID, userScheduleData) {
        const updates = {};
        updates[`/groupSchedules/${groupScheduleID}/userSchedules/${userID}`] = userScheduleData;
        const a = update(ref(db), updates);
        console.log(a);
        return a;
    }

    /*
    availabilityMatrices: a list of up to 7 strings, each one representing a given user's availability throughout a certain weekday
    */
    static getTimeRangesFromMatrices(availabilityMatrices) {
        let timeRanges = [];
        availabilityMatrices.forEach((allMinutes) => {
            let startMinute = null;
            let currentlyInRange = false;
            console.log(allMinutes)
            Array.from(allMinutes).forEach((minute, index) => {
                if(currentlyInRange && !minute) {
                    timeRanges.push({start: startMinute, end: index-1});
                    startMinute = null;
                    currentlyInRange = false;
                }
                else if(!currentlyInRange && minute) {
                    startMinute = index;
                    currentlyInRange = true;

                }
            });
            if(currentlyInRange)
                timeRanges.push({start: startMinute, end: 24*60-1});
        });

        return timeRanges;
    }

    static getTimeRangesFromMatrixStrings(matrixStrings) {
        return this.getTimeRangesFromMatrices(
            matrixStrings.map(matrixString => Array.from(matrixString).map(x => x==='1'))
        )
    }

    static getGroupTimeRangesFromMatrices(groupAvailabilityMatrices) {
        const userNames = Object.keys(groupAvailabilityMatrices);
        let timeRanges = [];

        for(let i = 0; i < 7; ++i) {
            let dayTimeRanges = [];

            let availableUsersForCurrentRange = [];
            let startMinuteOfCurrentRange = 0;
            for(let minute = 0; minute < 24*60; ++minute) {
                let g = userNames.filter((name) => groupAvailabilityMatrices[name][i][minute]);
                if((JSON.stringify(g) !== JSON.stringify(availableUsersForCurrentRange))) {
                    if(availableUsersForCurrentRange.length > 0 ) {
                        dayTimeRanges.push(
                            {start: startMinuteOfCurrentRange,
                            end: minute-1,
                            users: availableUsersForCurrentRange}
                        );
                    }
                    availableUsersForCurrentRange = g;
                    startMinuteOfCurrentRange = minute;
                }
            }
            if(availableUsersForCurrentRange.length > 0) {
                    dayTimeRanges.push({start: startMinuteOfCurrentRange, end: 24*60-1, users: availableUsersForCurrentRange});
                }
            timeRanges.push(dayTimeRanges);
        }

        return timeRanges;
    }
}

export default FireBaseManager;

