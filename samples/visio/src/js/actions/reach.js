import history from '../history';
import {initComSDK, getReach } from '../utils/com';

export const ADD_PARTICIPANT = 'ADD_PARTICIPANT';
export const UPDATE_PARTICIPANT = 'UPDATE_PARTICIPANT';
export const LOGGED = 'LOGGED';
export const LOGOUT = 'LOGOUT';
export const RECEIVE_INVITATION = 'RECEIVE_INVITATION';
export const INVITATION_SENT = 'INVITATION_SENT';
export const INVITATION_ANSWERED = 'INVITATION_ANSWERED';

export function addParticipant(username, data) {
	return {
		type: ADD_PARTICIPANT,
		data: {
			username,
			info: data
		}
	};
}

export function updateParticipant(username, data) {
	return {
		type: UPDATE_PARTICIPANT,
		data: {
			username,
			info: data
		}
	};
}

export function islogged(username) {
	return {
		type: LOGGED,
		data: username
	};
}

export function receiveInvitation(data) {
	return {
		type: RECEIVE_INVITATION,
		data
	};
}

export function invitationSent(invitee) {
	return {
		type: INVITATION_SENT,
		data: invitee
	};
}

export function invitationAnswered(accept, roomname, owner) {
	return {
		type: INVITATION_ANSWERED,
		data: {
			accept,
			roomname,
			owner
		}
	};
}

export function logout() {
	const reach = getReach();
	reach.close();
	history.replaceState(null, '/');
	return {
		type: LOGOUT
	};
}

export function login(username) {
	return dispatch => {
		initComSDK(username);

		history.replaceState(null, '/participants');

		dispatch(islogged(username));

		const reach = getReach();

		reach.on('userAdded', (data) => {
			const username = Object.keys(data)[0];
			dispatch(addParticipant(username, data[username]));
		});

		reach.on('userChanged', (data) => {
			const username = Object.keys(data)[0];
			dispatch(updateParticipant(username, data[username]));
		});

		reach.on('newRoomInvitation', (data) => {
			dispatch(receiveInvitation(data));
		});
	};
}

export function sendInvitation(me, invitee) {
	return dispatch => {
		const reach = getReach();

		dispatch(invitationSent(invitee));

		reach.inviteToRoom(`${me}-${invitee}`, [invitee], 'test', (rId, invitee, status, info) => {
			dispatch(invitationAnswered(status === 'ACCEPTED', rId, me));
			if (status === 'ACCEPTED') {
				history.replaceState(null, '/visio');
			}
		});
	};
}

export function respondToInvitation(accept, data, reason) {
	return dispatch => {
		const reach = getReach();

		if (accept) {
			const invitname = Object.keys(data)[0];
			const roomname = data[invitname].room;
			const owner = data[invitname].from;
			reach.acceptInvitation(data);
			dispatch(invitationAnswered(accept,roomname, owner));
			history.replaceState(null, '/visio');
		}
		else {
			reach.rejectInvitation(data, reason);
			dispatch(invitationAnswered(accept));
		}

	};
}