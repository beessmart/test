var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , crypto = require('crypto')
  , fs = require('fs')
  , os=require('os')
  , orm = require('orm')
  , i18n = require('i18next')
  , passport = require('passport')
  , flash = require('connect-flash')
  , LocalStrategy = require('passport-local').Strategy;

/************ INITIALIZATION **************/
i18n.init({
    ns: { namespaces: ['common'], defaultNs: 'common'},
    saveMissing: true,
    debug: false
});

var opts = {
	database : "smartpanel",
	protocol : "mysql",
	host : "127.0.0.1",
	port : 3306,         // optional, defaults to database default
	user : "root",
	password : "warning",
	query : {
		pool: true,   // optional, false by default
		debug : false   // optional, false by default
	}
};

var db = orm.connect(opts);

db.on("connect", function (err, db) {
	console.log("Correctly connected to Database!");
	//crea o modifica la struttura di tabelle in accordo con le definizioni dei models
	db.sync();
});

db.load("./model/models.js", function (err) {
	if(err){console.log("model loading error");}
});

passport.use(new LocalStrategy(
		function(username, password, done) {
			var User = db.models.user;
			User.find({ username: username }, function(err, user) {
				if (err) { 
					console.log(err);
					return done(err); }
				if (!user) {
					return done(null, false, { message: 'Incorrect username.' });
				}
				/*if (!user.validPassword(password)) {
					return done(null, false, { message: 'Incorrect password.' });
				}*/
				return done(null, user);
			});
		}
	)
);

passport.serializeUser(function(user, done) {
	console.log(user[0]);
	done(null, user[0].id);
});

passport.deserializeUser(function(id, done) {
	User.find(id, function(err, user) {
		done(err, user);
	});
});

var app = express();
app.set('port', process.env.PORT || 81);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev')); 
app.use(express.bodyParser());
app.use(i18n.handle);
app.use(express.methodOverride());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router); 
app.use(express.static(path.join(__dirname, 'public')));
app.use('/locales', express.static(path.join(__dirname, 'locales')));
app.use(flash());

i18n.registerAppHelper(app);
//per la gestione del catalogo dei messaggi lato client
i18n.serveClientScript(app).serveDynamicResources(app).serveMissingKeyRoute(app);

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

/************************ PAGES ************************/
app.get('/', routes.index);
app.get('/home', routes.index);
app.get('/reservations', passport.authenticate('local', { successRedirect: '/reservations', failureRedirect: '/home'}), routes.reservations);
app.get('/faq', passport.authenticate('local'), routes.faq);
app.get('/scope', passport.authenticate('local'), routes.scope);
app.get('/login', passport.authenticate('local'), function(req,res) {
	console.log("Authentication succeded!");
});

app.get('/utils/populateDB', function(req, res){
	var User = db.models.user;
	User.create([{
		username: "c.mirabile@inovaspa.it",
		password: "warning"
	}], function (err, items) {
		// err - description of the error or null
		// items - array of inserted items
	});
});

app.get("/utils/testORM", function (req, res) {
	var Person = db.models.person;
	Person.find().each(function(person){
		console.log(person.name);
	});
});

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});