#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address;
use soroban_sdk::testutils::Ledger;
use soroban_sdk::{vec, Env};

fn create_journey<'a>(env: &Env) -> (SwissTrainManagerContractClient<'a>, Bytes, u64) {
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SwissTrainManagerContract);
    let client = SwissTrainManagerContractClient::new(&env, &contract_id);

    let operator = soroban_sdk::Address::generate(&env);
    client.init(&operator);

    let timestamp = 1723122000_u64; // 2024-08-08
    env.ledger().with_mut(|li| {
        li.timestamp = timestamp;
    });

    let stops = vec![
        &env, 8500010, 8500301, 8500320, 8500305, 8500309, 8503504, 8503000,
    ];
    let timetable = vec![
        &env,
        1723122000 + 3600,
        1723122000 + 4000,
        1723122000 + 5000,
        1723122000 + 6000,
        1723122000 + 7000,
        1723122000 + 8000,
        1723122000 + 9000,
    ];

    let journey_ref = Bytes::from_slice(&env, &"ch:1:sjyid:100001:1961-001".as_bytes());
    let departure_time = timestamp + 3600;
    let arrival_time = timestamp + 9000;

    client.schedule_journey(
        &journey_ref,
        &departure_time,
        &arrival_time,
        &stops,
        &timetable,
    );

    (client, journey_ref, timestamp)
}

#[test]
fn test_initialize_contract() {
    let env = Env::default();

    let contract_id = env.register_contract(None, SwissTrainManagerContract);
    let client = SwissTrainManagerContractClient::new(&env, &contract_id);

    let operator = soroban_sdk::Address::generate(&env);
    client.init(&operator);
}

#[test]
fn test_get_journey() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SwissTrainManagerContract);
    let client = SwissTrainManagerContractClient::new(&env, &contract_id);

    let journey: Journey = client.get_journey();

    let journey_ref = Bytes::from_slice(&env, &"NOT_SCHEDULED".as_bytes());
    assert_eq!(journey.journey_ref, journey_ref);
    assert_eq!(journey.current_stop, u32::MAX);
    assert_eq!(journey.journey_status, JourneyStatus::Unplanned);
    assert_eq!(journey.stop_refs.len(), 0);
    assert_eq!(journey.stop_timetable.len(), 0);
    assert_eq!(journey.stop_arrivals.len(), 0);
}

#[test]
fn test_schedule_journey() {
    let env = Env::default();

    let (client, journey_ref, _) = create_journey(&env);
    let journey: Journey = client.get_journey();

    assert_eq!(journey.journey_ref, journey_ref);
    assert_eq!(journey.current_stop, u32::MAX);
    assert_eq!(journey.journey_status, JourneyStatus::Scheduled);
    assert_eq!(journey.stop_refs.len(), 7);
    assert_eq!(journey.stop_timetable.len(), 7);
    assert_eq!(journey.stop_arrivals.len(), 7);
}

#[test]
fn test_check_in() {
    let env = Env::default();

    let (client, journey_ref, timestamp) = create_journey(&env);
    let mut journey: Journey = client.get_journey();
    assert_eq!(journey.journey_ref, journey_ref);
    assert_eq!(journey.current_stop, u32::MAX);
    assert_eq!(journey.journey_status, JourneyStatus::Scheduled);

    client.check_in(&0_u32, &timestamp);
    journey = client.get_journey();
    assert_eq!(journey.current_stop, 0_u32);
    assert_eq!(journey.journey_status, JourneyStatus::Ongoing);

    client.check_in(&1_u32, &timestamp);
    journey = client.get_journey();
    assert_eq!(journey.current_stop, 1_u32);
    assert_eq!(journey.journey_status, JourneyStatus::Ongoing);

    client.check_in(&2_u32, &timestamp);
    journey = client.get_journey();
    assert_eq!(journey.current_stop, 2_u32);
    assert_eq!(journey.journey_status, JourneyStatus::Ongoing);

    client.check_in(&3_u32, &timestamp);
    journey = client.get_journey();
    assert_eq!(journey.current_stop, 3_u32);
    assert_eq!(journey.journey_status, JourneyStatus::Ongoing);

    client.check_in(&4_u32, &timestamp);
    journey = client.get_journey();
    assert_eq!(journey.current_stop, 4_u32);
    assert_eq!(journey.journey_status, JourneyStatus::Ongoing);

    client.check_in(&5_u32, &timestamp);
    journey = client.get_journey();
    assert_eq!(journey.current_stop, 5_u32);
    assert_eq!(journey.journey_status, JourneyStatus::Ongoing);

    client.check_in(&6_u32, &timestamp);
    journey = client.get_journey();
    assert_eq!(
        journey.current_stop,
        u32::MAX,
        "After reaching final station, journey should be reset"
    );
    assert_eq!(
        journey.journey_status,
        JourneyStatus::Unplanned,
        "After reaching final station, journey should be reset"
    );
}
