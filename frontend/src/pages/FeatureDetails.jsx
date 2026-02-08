import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
	ArrowLeftIcon, 
	SparklesIcon, 
	CheckCircleIcon,
	RocketLaunchIcon
} from '@heroicons/react/24/outline'
import features from '../data/features'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import TiltCard from '../components/TiltCard'
import MagneticButton from '../components/MagneticButton'
import AnimatedBackground from '../components/AnimatedBackground'

const FeatureDetails = () => {
	const { slug } = useParams()
	const { isDark } = useTheme()
	const feature = features.find((f) => f.slug === slug)

	if (!feature) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-ink transition-colors duration-300">
				<AnimatedBackground />
				<div className="text-center p-6 relative z-10">
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
					>
						<h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-alabaster">Feature Not Found</h2>
						<p className="text-lg text-slate-600 dark:text-dusty mb-8 max-w-md mx-auto">
							We couldn't find the feature you're looking for.
						</p>
						<Link to="/">
							<MagneticButton variant="primary">
								<ArrowLeftIcon className="w-5 h-5 mr-2" />
								Back to Home
							</MagneticButton>
						</Link>
					</motion.div>
				</div>
			</div>
		)
	}

	const benefits = [
		"Real-time synchronization across all devices",
		"Advanced security and privacy protection",
		"Seamless integration with existing systems",
		"24/7 automated monitoring and alerts"
	]

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-ink transition-colors duration-300">
			<AnimatedBackground />
			
			{/* Hero Section */}
			<section className="relative pt-24 pb-12 px-4 overflow-hidden">
				<div className="max-w-7xl mx-auto relative z-10">
					{/* Breadcrumb */}
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="mb-8"
					>
						<Link 
							to="/" 
							className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-dusty hover:text-cyan-600 dark:hover:text-neon-cyan transition-colors group"
						>
							<ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
							Back to Features
						</Link>
					</motion.div>

					{/* Hero Content */}
					<div className="grid lg:grid-cols-2 gap-12 items-center">
						{/* Left: Text Content */}
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
						>
							<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/20 dark:border-cyan-500/30 mb-6 backdrop-blur-sm">
								<SparklesIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
								<span className="text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider">
									Premium Feature
								</span>
							</div>

							<div className="flex items-start gap-4 mb-6">
								<div className="text-6xl">{feature.icon}</div>
								<div>
									<h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-alabaster mb-4 leading-tight">
										{feature.title}
									</h1>
									<p className="text-lg text-slate-600 dark:text-dusty leading-relaxed">
										{feature.description}
									</p>
								</div>
							</div>

							{/* CTA Buttons */}
							<div className="flex flex-wrap gap-4 mt-8">
								<Link to="/dashboard">
									<MagneticButton variant="primary" glowColor="rgba(94, 234, 212, 0.5)">
										<RocketLaunchIcon className="w-5 h-5 mr-2" />
										Try It Now
									</MagneticButton>
								</Link>
								<a 
									href="#detailed-overview" 
									className="px-6 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-500 dark:hover:border-neon-cyan hover:text-cyan-600 dark:hover:text-neon-cyan transition-all duration-300 font-medium"
								>
									Learn More
								</a>
							</div>
						</motion.div>

						{/* Right: Image */}
						<motion.div
							initial={{ opacity: 0, x: 30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
						>
							<TiltCard glowColor={isDark ? "rgba(94, 234, 212, 0.2)" : "rgba(56, 189, 248, 0.2)"} intensity={8}>
								<div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200 dark:ring-white/10">
									<img 
										src={feature.image} 
										alt={feature.title} 
										className="w-full h-auto object-cover"
										style={{ aspectRatio: '16/10' }}
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none" />
								</div>
							</TiltCard>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="py-16 px-4 relative z-10">
				<div className="max-w-7xl mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="mb-12 text-center"
					>
						<h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-alabaster mb-4">
							Key Benefits
						</h2>
						<p className="text-lg text-slate-600 dark:text-dusty max-w-2xl mx-auto">
							Discover what makes this feature essential for your journey
						</p>
					</motion.div>

					<div className="grid md:grid-cols-2 gap-6">
						{benefits.map((benefit, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
							>
								<TiltCard glowColor={isDark ? "rgba(94, 234, 212, 0.1)" : "rgba(56, 189, 248, 0.1)"} intensity={5}>
									<div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-full">
										<div className="flex items-start gap-4">
											<div className="flex-shrink-0">
												<CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
											</div>
											<p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
												{benefit}
											</p>
										</div>
									</div>
								</TiltCard>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Detailed Overview Section */}
			<section id="detailed-overview" className="py-16 px-4 relative z-10">
				<div className="max-w-4xl mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<TiltCard glowColor={isDark ? "rgba(94, 234, 212, 0.15)" : "rgba(56, 189, 248, 0.15)"} intensity={6}>
							<div className="p-8 md:p-12 rounded-2xl bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50">
								<h2 className="text-3xl font-bold text-slate-900 dark:text-alabaster mb-6 flex items-center gap-3">
									<SparklesIcon className="w-8 h-8 text-cyan-600 dark:text-neon-cyan" />
									Detailed Overview
								</h2>

								<div className="prose prose-slate dark:prose-invert max-w-none">
									{feature.longDescription ? (
										feature.longDescription.split('\n\n').map((para, idx) => (
											<motion.p 
												key={idx} 
												initial={{ opacity: 0, y: 10 }}
												whileInView={{ opacity: 1, y: 0 }}
												viewport={{ once: true }}
												transition={{ duration: 0.5, delay: idx * 0.1 }}
												className="text-base md:text-lg text-slate-700 dark:text-slate-300 mb-6 leading-relaxed first-letter:text-4xl first-letter:font-bold first-letter:text-cyan-600 dark:first-letter:text-neon-cyan first-letter:float-left first-letter:mr-3 first-letter:mt-1"
											>
												{para}
											</motion.p>
										))
									) : (
										<p className="text-base md:text-lg text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
											{feature.description}
										</p>
									)}
								</div>

								{/* Feature Stats/Highlights */}
								<div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
									<div className="grid grid-cols-3 gap-6 text-center">
										<div>
											<div className="text-3xl font-bold text-cyan-600 dark:text-neon-cyan mb-2">24/7</div>
											<div className="text-sm text-slate-600 dark:text-dusty">Availability</div>
										</div>
										<div>
											<div className="text-3xl font-bold text-cyan-600 dark:text-neon-cyan mb-2">100%</div>
											<div className="text-sm text-slate-600 dark:text-dusty">Secure</div>
										</div>
										<div>
											<div className="text-3xl font-bold text-cyan-600 dark:text-neon-cyan mb-2">∞</div>
											<div className="text-sm text-slate-600 dark:text-dusty">Reliable</div>
										</div>
									</div>
								</div>
							</div>
						</TiltCard>
					</motion.div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 px-4 relative z-10">
				<div className="max-w-4xl mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<TiltCard glowColor={isDark ? "rgba(94, 234, 212, 0.2)" : "rgba(56, 189, 248, 0.2)"} intensity={8}>
							<div className="text-center p-12 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 backdrop-blur-xl border border-cyan-500/20 dark:border-cyan-500/30">
								<h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-alabaster mb-4">
									Ready to Experience It?
								</h2>
								<p className="text-lg text-slate-600 dark:text-dusty mb-8 max-w-2xl mx-auto">
									Join thousands of riders who trust Rider Saathi for their safety and convenience
								</p>
								<div className="flex flex-wrap gap-4 justify-center">
									<Link to="/dashboard">
										<MagneticButton variant="primary" glowColor="rgba(94, 234, 212, 0.5)">
											<RocketLaunchIcon className="w-5 h-5 mr-2" />
											Get Started Now
										</MagneticButton>
									</Link>
									<Link to="/">
										<button className="px-8 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-500 dark:hover:border-neon-cyan hover:text-cyan-600 dark:hover:text-neon-cyan transition-all duration-300 font-medium">
											Explore More Features
										</button>
									</Link>
								</div>
							</div>
						</TiltCard>
					</motion.div>
				</div>
			</section>

			<Footer />
		</div>
	)
}

export default FeatureDetails
