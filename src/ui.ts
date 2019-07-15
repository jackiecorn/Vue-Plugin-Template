const Vue = require('vue');
const VTooltip = require('v-tooltip');
import App from './ui.vue';

Vue.use(VTooltip);

new Vue(
	Vue.extend({
		el: '#app',
		render: h => h(App)
	})
);
