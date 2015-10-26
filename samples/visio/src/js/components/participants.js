import React, { Component, PropTypes } from 'react';
import history from '../history';

export default class Participants extends Component {

	static propTypes = {
		participants: PropTypes.array.isRequired,
		username: PropTypes.string.isRequired,
		logged: PropTypes.bool.isRequired,
		sendInvitation: PropTypes.func.isRequired
	}

	componentWillMount() {
		if (!this.props.logged) {
			history.replaceState(null, '/');
		}
	}

	logout() {
		this.props.logout();
	}

	render() {
		const createParticipant = (p) => {
			const status = p.info.connectedList ? 'list-group-item-success' : 'list-group-item-danger';

			if (this.props.username === p.username) {
				return;
			}

			return <button type="button"
				disabled={!p.info.connectedList}
				className={`list-group-item ${status}`}
				key={`user_${p.username}`}
				onClick={this.props.sendInvitation.bind(this, this.props.username, p.username)}>
				{p.username + (p.invitSent ? ' (invit sent)' : '') }
			</button>;
		}

		const getContent = () => {
			if (this.props.participants.length <= 1) {
				return (
					<div>No participants registered</div>
				);
			} else {
				return (
					<div id="partipantsBox">
						<h2>Available participants</h2>
						<div className="list-group" id="participantList">
											{this.props.participants.map((p) => {
												return createParticipant.bind(this)(p);
											})}
						</div>
					</div>
				);
			}
		}

		return (
			<div className="container">
				<div className='logout'>
					<button type='button' className='btn btn-default' onClick={this.logout.bind(this)}>
						<span className='glyphicon glyphicon-log-out' aria-hidden='true'></span>
					</button>
				</div>
				<div className="row">
					<div className="col-md-6 col-md-offset-3">
						<div className="panel panel-default partipantsPanel">
							<div className="panel-body">
								{getContent()}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}