/**
 *
 * Parameter Validation Services
 *
 * @module      :: User
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Utility functions for performing argument validation
 *
 **/

function _isSportsRelated(test){
	var posPatt = new RegExp("(sport)|(athletic)|(exercise)|(outdoor)|(technology)|(electronics)|(workout)|(health)|(fitness)|(gym)", "i");

	var negPatt = new RegExp("(makeup)|(hair care)", "i");

	return posPatt.test(test) && !negPatt.test(test);
}

function _isVular(test){
	var negPatt = new RegExp("(sex)|(masterbation)|(porn)|(penis)|(vagina)|(anal)|(ass)|(shit)|(fuck)|(cock)|(pussy)|(vibrator)|(dildo)|(condom)|(viagra)|(cialis)|(erectile)|(tits)|(titties)|(boobs)|(boob)|(coon)|(raccoon)|(depend)|(wrench)|(scrotum)|(exotic)|(tampon)|(maxi)|(cum)|(cunt)|(jizz)|(whore)|(blowjob)|(deer)|(weed)|(bong)|(vodka)|(slut)|(alcohol)|(wine)|(boner)|(hump)|(hunt)|(cargo)|(spic)|(fishing)|(gun)|(shotgun)|(pistol)|(rifle)|(pot)|(blood)|(stripper)|(sperm)|(tongue)|(butt)|(knife)|(mom)|(cooter)|(negro)|(twat)|(cunt)|(banger)|(lube)|(lubricant)|(blowjob)|(blow job)|(milf)|(titty)|(titties)|(hidden)|(strapon)|(pecker)|(bachelorette)|(bend over)|(bullet)|(vibrate)|(topless)|(naughty)|(fisting)|(hand job)|(jenna)|(girlfriend)|(boyfriend)|(dirty)|(french)", "i");

	return negPatt.test(test);
}

module.exports = {
	
	// verifies that the params (properties) exist on the supplied object
	// and returns a list of missing params
	validateParams: function(req, params){
		var badParams = [];

		if(Array.isArray(params)){
			if(req){
				for(var i = 0; i < params.length; i++){
					if(!(req.param(params[i]))){
						badParams.push(params[i]);
					}
				}
			}
		}

		return badParams;
	},

	/**
	 *    Used to make sure the product doesn't contain vulgar information or is not sports related
	 **/
	validateIndixProduct: function(category, title){


		//The category must pass the sport-related test, but also not be vulgar (yes that actually happens), and the name/title should pass the vuglar check
		return _isSportsRelated(category)
			&& !_isVular(category) && !_isVular(title);
	},

	/**
	 *    Used to make sure the product is sports related
	 **/
	validateSportsRelated: function(category, title){
		return _isSportsRelated(category) && _isSportsRelated(title);
	}


};
