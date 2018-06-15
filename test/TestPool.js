const Ships = artifacts.require('../contracts/Ships.sol');
const Polls = artifacts.require('../contracts/Polls.sol');
const Claims = artifacts.require('../contracts/Claims.sol');
const Constitution = artifacts.require('../contracts/Constitution.sol');
const Pool = artifacts.require('../contracts/Pool.sol');

const assertRevert = require('./helpers/assertRevert');

contract('Pool', function([owner, user1, user2]) {
  let ships, polls, constit, pool, oneStar;

  before('setting up for tests', async function() {
    ships = await Ships.new();
    polls = await Polls.new(432000, 432000);
    claims = await Claims.new(ships.address);
    constit = await Constitution.new(0, ships.address, polls.address,
                                     0, '', '', claims.address);
    await ships.transferOwnership(constit.address);
    await polls.transferOwnership(constit.address);
    await constit.createGalaxy(0, user1);
    await constit.configureKeys(0, 10, 11, 1, false, {from:user1});
    await constit.spawn(512, user2, {from:user1});
    await constit.transferShip(512, user2, false, {from:user2});
    pool = await Pool.new(ships.address);
    oneStar = (await pool.oneStar()).toNumber();
  });

  it('deposit star as galaxy owner', async function() {
    // must only accept stars.
    await assertRevert(pool.deposit(0, {from:user1}));
    // must fail if no spawn rights.
    await assertRevert(pool.deposit(256, {from:user1}));
    await constit.setSpawnProxy(0, pool.address, {from:user1});
    // must fail if caller is not galaxy owner.
    await assertRevert(pool.deposit(256));
    // deposit as galaxy owner.
    await pool.deposit(256, {from:user1});
    assert.isTrue(await ships.isOwner(256, pool.address));
    assert.equal((await pool.balanceOf(user1)).toNumber(), oneStar);
    let res = await pool.getAllAssets();
    assert.equal(res.length, 1);
    assert.equal(res[0], 256);
  });

  it('deposit star as star owner', async function() {
    // can't deposit if not transferrer.
    await assertRevert(pool.deposit(512, {from:user2}));
    await constit.setTransferProxy(512, pool.address, {from:user2});
    // can't deposit if not owner.
    await assertRevert(pool.deposit(512, {from:user1}));
    // deposit as star owner.
    await pool.deposit(512, {from:user2});
    assert.isTrue(await ships.isOwner(512, pool.address));
    assert.equal((await pool.balanceOf(user2)).toNumber(), oneStar);
    let res = await pool.getAllAssets();
    assert.equal(res.length, 2);
    assert.equal(res[0], 256);
    assert.equal(res[1], 512);
  });

  it('withdraw a star', async function() {
    // can't withdraw non-pooled star
    await assertRevert(pool.withdraw(500, {from:user1}));
    // withdraw a star
    await pool.withdrawAny({from:user1});
    assert.isTrue(await ships.isOwner(512, user1));
    assert.equal((await pool.balanceOf(user1)), 0);
    let res = await pool.getAllAssets();
    assert.equal(res.length, 1);
    assert.equal(res[0].toNumber(), 256);
    // can't withdraw without balance.
    await assertRevert(pool.withdrawAny({from:user1}));
  });
});
