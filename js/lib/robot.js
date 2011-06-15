function Robot() {
  this._a = null;
  this._b = null;
  this._rotation = null;

  this._currentProgram = 'main';
  this._currentArgs = [];
  this._currentInstruction = 'init';
  this._remainingCycles = 0;

  this._code = null;
  this._game = null;
  this._creator = null;
  this._player = null;


  // HACK
  this._args = [];
}

Robot.create = function(code, player, game) {
  var instance = new this();
  instance._creator = instance._player = player;
  instance._code = code;
  instance._game = game;
  return instance;
};

Robot.prototype.setCoordinates = function(a, b) {
  this._a = a;
  this._b = b;
};

Robot.prototype.getCoordinates = function() {
  return {a: this._a, b: this._b};
};

Robot.prototype.getPlayer = function() {
  return this._player;
};

Robot.prototype.setRotation = function(rotation) {
  this._rotation = rotation;
};

Robot.prototype.getRotation = function() {
  return this._rotation;
};

Robot.prototype.rotate = function(direction) {
  var spin = 0;

  if (direction === 'right') {
    spin = 1;
  }

  if (direction === 'left') {
    spin = -1;
  }

  if (!spin) {
    throw new Error('rotate: invalid direction: ' + direction);
  }

  this._rotation = (this._rotation + spin + 4) % 4;
  this._game.emit('rotate', this);
};

Robot.prototype.move = function() {
  var newCoordinates = this._game._getCoordinatesInFrontOf(this);
  if (this._game._getRobot(newCoordinates.a, newCoordinates.b)) {
    return;
  }

  var oldCoordinates = this.getCoordinates();
  this.setCoordinates(newCoordinates.a, newCoordinates.b);

  this._game._removeRobot(oldCoordinates.a, oldCoordinates.b);
  this._game._setRobot(newCoordinates.a, newCoordinates.b, this);

  this._game.emit('move', this, oldCoordinates);
};

Robot.prototype.build = function() {
  this._game.buildRobot(this);
};

Robot.prototype.scan = function() {
  var coordinates = this._game._getCoordinatesInFrontOf(this);
  var robot = this._game._getRobot(coordinates);
  //if (
};

Robot._getCallbackName = function(instruction) {
  var firstLetter = instruction.substr(0, 1);
  var remainingLetters = instruction.substr(1);

  return 'after' + firstLetter.toUpperCase() + remainingLetters;
};

Robot.prototype.nextTick = function(afterTick) {
  var self = this
  if (self._remainingCycles > 0) {
    self._remainingCycles--;
    setTimeout(afterTick);
    return;
  }

  var executeFn = instructions[self._currentInstruction].execute;
  var resultArgs = executeFn.call({}, self._game, self, self._currentArgs);
  if (resultArgs) {
    resultArgs = [].concat(resultArgs);
  }

  var callbackName = Robot._getCallbackName(self._currentInstruction);
  var caller = self._code;
  /*var callbackFn = self._code[self._currentProgram][callbackName];

  if (!callbackFn) {
    console.log('missing callback: ' + callbackName);
    self._commitSuicide();
    return;
  }

  var nextArgs = callbackFn.apply({}, resultArgs || []);*/
  caller(self._currentProgram, callbackName, resultArgs, function(err, nextArgs) {
    if (err) {
      console.log('Error ' + err);
      self._commitSuicide();
      return afterTick();
    }
    if (!nextArgs) {
      console.log('emtpy method: ' + callbackName);
      self._commitSuicide();
      return afterTick();
    }
    var nextInstruction = nextArgs.shift();

    if (!(nextInstruction in instructions)) {
      console.log('unknown instruction: ' + nextInstruction);
      self._commitSuicide();
      return afterTick();
    }

    var costs = instructions[nextInstruction].costs;
    if (typeof costs === 'function') {
      costs = costs.call({}, self._game, self);
    }

    if (costs instanceof Error) {
      console.log('costs error: ' + costs.message);
      self._commitSuicide();
      return afterTick();
    }

    self._remainingCycles = costs;
    self._currentInstruction = nextInstruction;
    self._currentArgs = nextArgs;
    return afterTick();
  })
  //console.log(self._currentInstruction, self._currentArgs);
};

Robot.prototype._commitSuicide = function() {
  this._game.kill(this);
};
