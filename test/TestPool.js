const Ships = artifacts.require('../contracts/Ships.sol');
const Polls = artifacts.require('../contracts/Polls.sol');
const Constitution = artifacts.require('../contracts/Constitution.sol');
const Pool = artifacts.require('../contracts/Pool.sol');

contract('Pool', function([owner, user1, user2]) {
  let ships, polls, constit, pool;

  function assertJump(error) {
    assert.isAbove(error.message.search('revert'), -1, 'Revert must be returned, but got ' + error);
  }

  before('setting up for tests', async function() {
    ships = await Ships.new();
    polls = await Polls.new(0, 0);
    constit = await Constitution.new(0, ships.address, polls.address);
    await ships.transferOwnership(constit.address);
    await polls.transferOwnership(constit.address);
    await constit.createGalaxy(0, user1);
    await constit.configureKeys(0, 10, 11, {from:user1});
    await constit.spawn(512, user2, {from:user1});
    pool = await Pool.new(ships.address);
  });

  it('deposit star as galaxy owner', async function() {
    // must only accept stars.
    try {
      await pool.deposit(0, {from:user1});
      assert.fail('should have thrown before');
    } catch(err) {
      assertJump(err);
    }
    // must fail if no spawn rights.
    try {
      await pool.deposit(256, {from:user1});
      assert.fail('should have thrown before');
    } catch(err) {
      assertJump(err);
    }
    await constit.setSpawnProxy(0, pool.address, {from:user1});
    // must fail if caller is not galaxy owner.
    try {
      await pool.deposit(256);
      assert.fail('should have thrown before');
    } catch(err) {
      assertJump(err);
    }
    // deposit as galaxy owner.
    await pool.deposit(256, {from:user1});
    assert.isTrue(await ships.isOwner(256, pool.address));
    assert.equal(await pool.balanceOf(user1), 1000000000000000000);
    let res = await pool.getAllAssets();
    assert.equal(res.length, 1);
    assert.equal(res[0], 256);
  });

  it('deposit star as star owner', async function() {
    // can't deposit if not transferrer.
    try {
      await pool.deposit(512, {from:user2});
      assert.fail('should have thrown before');
    } catch(err) {
      assertJump(err);
    }
    await constit.setTransferProxy(512, pool.address, {from:user2});
    // can't deposit if not owner.
    try {
      await pool.deposit(512, {from:user1});
      assert.fail('should have thrown before');
    } catch(err) {
      assertJump(err);
    }
    // deposit as star owner.
    await pool.deposit(512, {from:user2});
    assert.isTrue(await ships.isOwner(512, pool.address));
    assert.equal(await pool.balanceOf(user2), 1000000000000000000);
    let res = await pool.getAllAssets();
    assert.equal(res.length, 2);
    assert.equal(res[0], 256);
    assert.equal(res[1], 512);
  });

  it('withdraw a star', async function() {
    // can't withdraw a non-pooled star.
    try {
      await pool.withdraw(257, {from:user1});
      assert.fail('should have thrown before');
    } catch(err) {
      assertJump(err);
    }
    // withdraw a star
    await pool.withdraw(256, {from:user1});
    assert.isTrue(await ships.isOwner(256, user1));
    assert.equal((await pool.balanceOf(user1)), 0);
    let res = await pool.getAllAssets();
    assert.equal(res.length, 1);
    assert.equal(res[0].toNumber(), 512);
    // can't withdraw without balance.
    try {
      await pool.withdraw(512, {from:user1});
      assert.fail('should have thrown before');
    } catch(err) {
      assertJump(err);
    }
  });
});
