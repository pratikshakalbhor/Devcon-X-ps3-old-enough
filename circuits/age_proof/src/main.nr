// Policy fixed by circuit (not the prover). Approximation: 18 years * 365.25 days.
// 18*365.25 = 6574.5, so 6575 days is the minimum integer days (>= 18 years with .25 leap-day approximation).
global MIN_AGE_DAYS: u32 = 6575;

fn main(
    // private
    birth_day: u32,
    salt: Field,
    // public
    current_day: pub u32,
    claimer: pub Field,
    nullifier: pub Field,
) {
    // Basic sanity
    assert(current_day >= birth_day);
    
    // Age check
    let age_days = current_day - birth_day;
    assert(age_days >= MIN_AGE_DAYS);
    
    // Nullifier check: nullifier == hash(salt, claimer)
    // Use stdlib hash
    let expected_nullifier = std::hash::pedersen_hash([salt, claimer]);
    assert(nullifier == expected_nullifier);
}

#[test]
fn adult() {
    let birth_day: u32 = 10000;
    let current_day: u32 = 20000; // age 10000 >= 6575
    let salt: Field = 12345;
    let claimer: Field = 67890;
    let nullifier = std::hash::pedersen_hash([salt, claimer]);
    main(birth_day, salt, current_day, claimer, nullifier);
}

#[test]
fn exact_boundary() {
    let birth_day: u32 = 1;
    let current_day: u32 = 1 + 6575; // exactly MIN_AGE_DAYS
    let salt: Field = 111;
    let claimer: Field = 222;
    let nullifier = std::hash::pedersen_hash([salt, claimer]);
    main(birth_day, salt, current_day, claimer, nullifier);
}

#[test(should_fail)]
fn one_day_short_should_fail() {
    let birth_day: u32 = 0;
    let current_day: u32 = 6574; // one day short
    let salt: Field = 333;
    let claimer: Field = 444;
    let nullifier = std::hash::pedersen_hash([salt, claimer]);
    main(birth_day, salt, current_day, claimer, nullifier);
}

#[test(should_fail)]
fn underage_should_fail() {
    let birth_day: u32 = 5000;
    let current_day: u32 = 10000; // age 5000 < 6575
    let salt: Field = 555;
    let claimer: Field = 666;
    let nullifier = std::hash::pedersen_hash([salt, claimer]);
    main(birth_day, salt, current_day, claimer, nullifier);
}

#[test(should_fail)]
fn future_birth_should_fail() {
    let birth_day: u32 = 20000;
    let current_day: u32 = 10000; // current < birth
    let salt: Field = 777;
    let claimer: Field = 888;
    let nullifier = std::hash::pedersen_hash([salt, claimer]);
    main(birth_day, salt, current_day, claimer, nullifier);
}

#[test(should_fail)]
fn wrong_nullifier_should_fail() {
    let birth_day: u32 = 0;
    let current_day: u32 = 20000;
    let salt: Field = 999;
    let claimer: Field = 1111;
    let wrong_nullifier: Field = 123456; // not the hash
    main(birth_day, salt, current_day, claimer, wrong_nullifier);
}
// Status: UNCOMPILED, UNTESTED (nargo missing). Hash function name unverified against the installed version.
