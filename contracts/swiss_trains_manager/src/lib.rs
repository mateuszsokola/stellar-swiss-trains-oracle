#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, Symbol, Vec,
};

#[derive(Clone, Debug, Copy, PartialEq, Eq)]
#[contracttype]
pub enum JourneyStatus {
    Unplanned = 0,
    Scheduled = 1,
    Ongoing = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct Journey {
    pub journey_ref: Bytes,
    pub current_stop: u32,
    pub journey_status: JourneyStatus,
    // place refs ()
    pub stop_refs: Vec<u32>,
    // estimated stop arrivals
    pub stop_timetable: Vec<u64>,
    // actual stop arrivals
    pub stop_arrivals: Vec<u64>,
}

const OPERATOR: Symbol = symbol_short!("OPERATOR");
const JOURNEY: Symbol = symbol_short!("JOURNEY");
const EVENT_JOURNEY: Symbol = symbol_short!("SCHEDULE");
const EVENT_CHECK_IN: Symbol = symbol_short!("CHECKIN");
const EVENT_COMPLETE: Symbol = symbol_short!("COMPLETE");

#[contract]
pub struct SwissTrainManagerContract;

#[contractimpl]
impl SwissTrainManagerContract {
    pub fn init(env: Env, operator: Address) {
        assert!(
            env.storage().instance().has(&OPERATOR) == false,
            "Operator is already set"
        );
        env.storage().instance().set(&OPERATOR, &operator);
    }

    pub fn get_journey(env: Env) -> Journey {
        env.storage().instance().get(&JOURNEY).unwrap_or(Journey {
            journey_ref: Bytes::from_slice(&env, &"NOT_SCHEDULED".as_bytes()),
            current_stop: u32::MAX,
            journey_status: JourneyStatus::Unplanned,
            stop_refs: Vec::new(&env),
            stop_timetable: Vec::new(&env),
            stop_arrivals: Vec::new(&env),
        })
    }

    pub fn schedule_journey(
        env: Env,
        journey_ref: Bytes,
        departure_time: u64,
        arrival_time: u64,
        stop_refs: Vec<u32>,
        stop_timetable: Vec<u64>,
    ) {
        let operator: Address = env.storage().instance().get(&OPERATOR).unwrap();
        operator.require_auth();

        assert_eq!(
            Self::get_journey(env.clone()).journey_status,
            JourneyStatus::Unplanned,
            "There is an active journey ongoing"
        );
        assert!(
            departure_time > env.ledger().timestamp(),
            "Journey must be in the future"
        );
        assert!(
            arrival_time > departure_time,
            "Arrival time must be greater than departure time"
        );
        assert_eq!(
            stop_refs.len(),
            stop_timetable.len(),
            "Stops and timetable must have the same size"
        );

        // create an empty stop arrivals array
        let mut stop_arrivals: Vec<u64> = Vec::new(&env);
        for _ in 1..=stop_refs.len() {
            stop_arrivals.push_back(u64::MAX);
        }

        // mutate the state
        let mut current_journey = Self::get_journey(env.clone());
        current_journey.journey_ref = journey_ref.clone();
        current_journey.current_stop = u32::MAX;
        current_journey.journey_status = JourneyStatus::Scheduled;
        current_journey.stop_refs = stop_refs;
        current_journey.stop_timetable = stop_timetable.clone();
        current_journey.stop_arrivals = stop_arrivals;

        env.storage().instance().set(&JOURNEY, &current_journey);
        env.events()
            .publish((&EVENT_JOURNEY,), (journey_ref, stop_timetable.get(0)));
    }

    pub fn check_in(env: Env, stop_index: u32, arrival_time: u64) {
        let operator: Address = env.storage().instance().get(&OPERATOR).unwrap();
        operator.require_auth();

        let mut journey = Self::get_journey(env.clone());
        assert!(stop_index < journey.stop_refs.len(), "Invalid stop index");

        if stop_index == journey.stop_refs.len() - 1 {
            Self::reset_journey(env.clone());
            env.events().publish(
                (&EVENT_CHECK_IN, &EVENT_COMPLETE),
                (journey.journey_ref, arrival_time),
            );
        } else {
            journey.journey_status = JourneyStatus::Ongoing;
            journey.stop_arrivals.set(stop_index, arrival_time);
            journey.current_stop = stop_index;
            env.storage().instance().set(&JOURNEY, &journey);
            env.events()
                .publish((&EVENT_CHECK_IN,), (journey.journey_ref, arrival_time));
        }
    }

    fn reset_journey(env: Env) -> Journey {
        // mutate the state
        let mut journey = Self::get_journey(env.clone());
        journey.journey_ref = Bytes::from_slice(&env, &"NOT_SCHEDULED".as_bytes());
        journey.current_stop = u32::MAX;
        journey.journey_status = JourneyStatus::Unplanned;
        journey.stop_refs = Vec::new(&env);
        journey.stop_timetable = Vec::new(&env);
        journey.stop_arrivals = Vec::new(&env);

        env.storage().instance().set(&JOURNEY, &journey);

        journey
    }
}

mod test;
