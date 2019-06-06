const Vue = require('vue');
import App from './ui.vue';

new Vue(
	Vue.extend({
		el: '#app',
		render: h => h(App)
	})
);
